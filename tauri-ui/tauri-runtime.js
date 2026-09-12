(() => {
  'use strict';

  const tauri = window.__TAURI__;
  if (!tauri?.core?.invoke) {
    console.error('[Workbench] Tauri runtime is unavailable.');
    return;
  }

  const invoke = tauri.core.invoke;
  const nativeFetch = window.fetch.bind(window);
  window.__HYTALE_DESKTOP_BRIDGE__ = true;
  window.__HYTALE_UI_SCALE__ = {
    setZoom: async (scaleFactor) => {
      if (!Number.isFinite(scaleFactor) || scaleFactor <= 0) throw new Error('Invalid UI scale.');
      const webview = tauri.webview?.getCurrentWebview?.();
      if (!webview?.setZoom) throw new Error('Tauri webview zoom API is unavailable.');
      await webview.setZoom(scaleFactor);
    },
  };
  window.__HYTALE_PERSISTENT_LOG__ = {
    append: (entries) => invoke('append_persistent_log_batch', { payload: { entries } }),
    status: () => invoke('persistent_log_status'),
    clear: () => invoke('clear_persistent_logs'),
  };

  if (tauri.event?.listen) {
    void tauri.event.listen('project-files-changed', (event) => {
      window.dispatchEvent(new CustomEvent('hgw:project-files-changed', { detail: event.payload }));
    }).catch((error) => console.error('[Workbench file watcher]', error));
    void tauri.event.listen('app-close-requested', (event) => {
      window.dispatchEvent(new CustomEvent('hgw:app-close-requested', { detail: event.payload }));
    }).catch((error) => console.error('[Workbench lifecycle]', error));
    void tauri.event.listen('app-update-progress', (event) => {
      window.dispatchEvent(new CustomEvent('hgw:app-update-progress', { detail: event.payload }));
    }).catch((error) => console.error('[Workbench updater]', error));
  }

  const jsonResponse = (value, status = 200) => new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });

  const errorResponse = (error) => jsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);

  const requestBody = (init) => {
    if (!init?.body) return {};
    if (typeof init.body !== 'string') throw new Error('Unexpected non-JSON request body.');
    return JSON.parse(init.body);
  };

  const asUrl = (input) => {
    if (input instanceof Request) return new URL(input.url);
    return new URL(String(input), window.location.href);
  };

  window.fetch = async function workbenchTauriFetch(input, init) {
    const url = asUrl(input);
    if (!url.pathname.startsWith('/api/')) return nativeFetch(input, init);

    try {
      if (url.pathname === '/api/project/open') {
        const scan = await invoke('select_project', { payload: requestBody(init) });
        return scan ? jsonResponse(scan) : new Response(null, { status: 204 });
      }
      if (url.pathname === '/api/project/open-recent') {
        return jsonResponse(await invoke('open_recent_project', { payload: requestBody(init) }));
      }
      if (url.pathname === '/api/project/recent/revoke') {
        await invoke('revoke_recent_project', { payload: requestBody(init) });
        return jsonResponse({ revoked: true });
      }
      if (url.pathname === '/api/project/reload') return jsonResponse(await invoke('reload_project'));
      if (url.pathname === '/api/project/probe') return jsonResponse(await invoke('probe_project_path', { payload: requestBody(init) }));
      if (url.pathname === '/api/project/probe/select') {
        const result = await invoke('select_project_probe_path');
        return result ? jsonResponse(result) : new Response(null, { status: 204 });
      }
      if (url.pathname === '/api/project/probe/remove') return jsonResponse(await invoke('remove_project_probe_path', { payload: requestBody(init) }));
      if (url.pathname === '/api/project/probe/reset') return jsonResponse(await invoke('reset_project_probe_paths'));
      if (url.pathname === '/api/project/close') return jsonResponse(await invoke('close_project'));
      if (url.pathname === '/api/app/pending-changes') return jsonResponse(await invoke('set_pending_changes', { payload: requestBody(init) }));
      if (url.pathname === '/api/app/update/check') return jsonResponse(await invoke('check_for_update', { payload: requestBody(init) }));
      if (url.pathname === '/api/app/update/install') return jsonResponse(await invoke('install_update', { payload: requestBody(init) }));
      if (url.pathname === '/api/app/exit') return jsonResponse(await invoke('exit_application'));
      if (url.pathname === '/api/project/file') {
        const path = url.searchParams.get('path') ?? '';
        const data = await invoke('read_project_file', { payload: { path } });
        const body = data instanceof ArrayBuffer
          ? data
          : ArrayBuffer.isView(data)
            ? data
            : new Uint8Array(Array.isArray(data) ? data : []);
        return new Response(body, { status: 200, headers: { 'Content-Type': 'application/octet-stream' } });
      }
      if (url.pathname === '/api/project/text-preview') {
        const path = url.searchParams.get('path') ?? '';
        return jsonResponse(await invoke('read_project_text_preview', { payload: { path } }));
      }
      if (url.pathname === '/api/project/conflicts') return jsonResponse(await invoke('check_conflicts', { payload: requestBody(init) }));
      if (url.pathname === '/api/project/apply') return jsonResponse(await invoke('apply_project_files', { payload: requestBody(init) }));
      if (url.pathname === '/api/worldgen/log/select') {
        const selection = await invoke('select_worldgen_log');
        return selection ? jsonResponse(selection) : new Response(null, { status: 204 });
      }
      if (url.pathname === '/api/worldgen/log/folder/select') {
        const selection = await invoke('select_worldgen_log_folder');
        return selection ? jsonResponse(selection) : new Response(null, { status: 204 });
      }
      if (url.pathname === '/api/worldgen/log/revoke') {
        await invoke('revoke_worldgen_log', { payload: requestBody(init) });
        return jsonResponse({ revoked: true });
      }
      if (url.pathname === '/api/worldgen/performance') return jsonResponse(await invoke('read_worldgen_performance', { payload: requestBody(init) }));
      if (url.pathname === '/api/output/select') {
        const output = await invoke('select_output_directory');
        return output ? jsonResponse(output) : new Response(null, { status: 204 });
      }
      if (url.pathname === '/api/output/existing') return jsonResponse(await invoke('existing_output_files', { payload: requestBody(init) }));
      if (url.pathname === '/api/output/export') return jsonResponse(await invoke('export_output', { payload: requestBody(init) }));
      return jsonResponse({ error: `Unknown desktop endpoint: ${url.pathname}` }, 404);
    } catch (error) {
      if (String(error).toLowerCase().includes('cancel')) return new Response(null, { status: 204 });
      console.error('[Workbench Tauri bridge]', error);
      return errorResponse(error);
    }
  };

  // ZIP downloads are intercepted and written only to a native save target selected
  // inside Rust. The WebView never receives or registers an arbitrary filesystem path.
  const blobUrls = new Map();
  const createObjectURL = URL.createObjectURL.bind(URL);
  const revokeObjectURL = URL.revokeObjectURL.bind(URL);
  URL.createObjectURL = (blob) => {
    const url = createObjectURL(blob);
    blobUrls.set(url, blob);
    return url;
  };
  URL.revokeObjectURL = (url) => {
    revokeObjectURL(url);
    setTimeout(() => blobUrls.delete(url), 30_000);
  };

  const nativeAnchorClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function tauriDownloadClick() {
    const blob = blobUrls.get(this.href);
    const suggestedName = this.download;
    if (!blob || !suggestedName) return nativeAnchorClick.call(this);

    void (async () => {
      try {
        const isDiagnosticReport = suggestedName.toLowerCase().endsWith('.json');
        const target = await invoke(isDiagnosticReport ? 'select_support_report_target' : 'select_save_target', { payload: { suggestedName } });
        if (!target?.token) return;
        const bytes = new Uint8Array(await blob.arrayBuffer());
        await invoke('write_registered_binary', bytes, {
          headers: { 'X-Hytale-Save-Token': target.token },
        });
      } catch (error) {
        console.error('[Workbench Tauri file save]', error);
        window.alert(`File export failed: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        blobUrls.delete(this.href);
      }
    })();
  };

  console.info('[Workbench] Native Tauri desktop host active.');
})();
