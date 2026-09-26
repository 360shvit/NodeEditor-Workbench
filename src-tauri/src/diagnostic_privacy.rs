use serde_json::{Map, Value};

// The native sink independently removes free text and path fields. It accepts
// only the structured envelope, counters and a small set of diagnostic enums.
// Renderer compromise is outside this privacy guarantee: operation identifiers
// are application metadata, not a covert-channel prevention mechanism.
fn identifier(value: &str) -> bool {
    !value.is_empty() && value.len() <= 120
        && value.bytes().all(|b| b.is_ascii_alphanumeric() || b"_.-".contains(&b))
}

fn counter(key: &str) -> bool {
    "collisions stagedChanges limit includeProjectPaths canonicalizationChecks fastPathCandidates fastPathUsed inputCount symbolCount projectDiagnostics nodeCount fileCount patchCount resultFiles blocked inventoryFiles semanticInputs projectFiles nodes symbols semanticReferences environmentReferences prefabReferences workspaces discoveryRoots restoredTabs restoredNavigationEntries changedPathCount invalidatedChanges invalidatedHistory pendingChanges changeCount changedFiles conflicts outputFiles written recent enabled desktop persisted sidebarWidth splitRatio splitViewEnabled minSidebarWidth maxSidebarWidth minSplitRatio maxSplitRatio uiScale percent size position maximized assigned descriptorCount rootCount eligibleFiles selectionMode visibleRows expandedFolders queryLength semanticFiles resourceFiles zoom rootIndex densityDepth includeResources edgeCount directories visitedEntries symlinkEntries reparsePointEntries workspaceMarkers candidateFiles semanticBytes probeBytes requestMs nativeTotalMs status durationMs line column count diagnosticDataOmitted".split(' ').any(|allowed| allowed == key)
}

fn route(value: &str) -> bool {
    value.len() <= 120 && value.strip_prefix("/api/").is_some_and(|tail|
        tail.split('/').all(|part| !part.is_empty() && part.bytes().all(|b| b.is_ascii_lowercase() || b == b'-')))
}

fn enumeration(key: &str, value: &str) -> bool {
    let allowed = match key {
        "errorName" => "Error TypeError SyntaxError RangeError ReferenceError URIError EvalError AbortError UnknownError",
        "status" => "failed completed",
        "classification" => "normal noteworthy slow very-slow",
        "host" => "desktop browser",
        "sourceKind" => "directory snapshot",
        "mode" => "apply project-copy zip-export",
        "kind" => "switch-project close-project exit-app",
        "outcome" => "blocked-conflict blocked-late-conflict blocked-collision applied exported cancelled",
        "channel" => "stable preview",
        "strategy" => "normalize author-normalize dag-rebuild",
        _ => return false,
    };
    allowed.split(' ').any(|allowed| allowed == value)
}

fn metadata(value: &Value, depth: usize, remaining: &mut usize) -> Value {
    let mut output = Map::new();
    if depth >= 4 { return Value::Object(output); }
    if let Some(data) = value.as_object() {
        for (key, value) in data.iter().take(40) {
            if *remaining == 0 { break; }
            *remaining -= 1;
            if counter(key) && (value.is_number() || value.is_boolean() || value.is_null()) {
                output.insert(key.clone(), value.clone());
            } else if value.as_str().is_some_and(|text| enumeration(key, text)) {
                output.insert(key.clone(), value.clone());
            } else if key == "operation" && value.as_str().is_some_and(|text| identifier(text)
                || text.strip_prefix("desktop.request:").is_some_and(route)) {
                output.insert(key.clone(), value.clone());
            } else if key == "endpoint" && value.as_str().is_some_and(route) {
                output.insert(key.clone(), value.clone());
            } else if matches!(key.as_str(), "metadata" | "counts" | "timings") && value.is_object() {
                output.insert(key.clone(), metadata(value, depth + 1, remaining));
            }
        }
    }
    Value::Object(output)
}

pub(super) fn persistent_entry(input: &Value) -> Result<Value, String> {
    let object = input.as_object().ok_or("Persistent-log entry must be an object.")?;
    let event = object.get("event").and_then(Value::as_str).filter(|value| identifier(value))
        .ok_or("Persistent-log event must be a bounded operation identifier.")?;
    let mut output = Map::new();
    output.insert("event".into(), Value::String(event.into()));
    for key in ["id", "durationMs"] {
        if let Some(value) = object.get(key).filter(|value| value.is_number()) { output.insert(key.into(), value.clone()); }
    }
    if let Some(value) = object.get("level").and_then(Value::as_str).filter(|value| matches!(*value, "debug" | "info" | "warn" | "error")) {
        output.insert("level".into(), Value::String(value.into()));
    }
    if let Some(value) = object.get("timestamp").and_then(Value::as_str).filter(|value| value.len() <= 30 && value.bytes().all(|b| b.is_ascii_digit() || b"-:TZ.".contains(&b))) {
        output.insert("timestamp".into(), Value::String(value.into()));
    }
    if let Some(value) = object.get("traceId").and_then(Value::as_str).filter(|value| identifier(value)) {
        output.insert("traceId".into(), Value::String(value.into()));
    }
    if let Some(value) = object.get("data") { output.insert("data".into(), metadata(value, 0, &mut 80)); }
    Ok(Value::Object(output))
}
