// AUTO-GENERATED from Hytale's shipped "HytaleGenerator Java" NodeEditor workspace.
// Do not hand-edit. Re-run scripts/generate-visual-catalog.mjs to refresh it.
import type { NodeVisualSpec } from './types.js';

export const HYTALE_GENERATOR_JAVA_VISUAL_CATALOG: Record<string, NodeVisualSpec> = {
  "Abs.Density": {
    "nodeKind": "Abs.Density",
    "title": "Abs Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "DensityInputs",
        "label": "Inputs",
        "type": "Density.Connection",
        "multiple": true
      }
    ]
  },
  "Adder.VectorProvider": {
    "nodeKind": "Adder.VectorProvider",
    "title": "Adder VectorProvider",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "VectorProvider.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Vectors",
        "label": "Vectors",
        "type": "VectorProvider.Connection",
        "multiple": true
      }
    ]
  },
  "All.EdgeSelector": {
    "nodeKind": "All.EdgeSelector",
    "title": "[DEV] All EdgeSelector",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "EdgeSelector.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "All.NodeSelector": {
    "nodeKind": "All.NodeSelector",
    "title": "[DEV] All NodeSelector",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "NodeSelector.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "AlwaysTrue.Condition.SpaceAndDepth.MaterialProvider": {
    "nodeKind": "AlwaysTrue.Condition.SpaceAndDepth.MaterialProvider",
    "title": "AlwaysTrue Condition SADMP",
    "fields": [],
    "leftPins": [
      {
        "id": "OutputPin",
        "label": "",
        "type": "Condition.SpaceAndDepth.MaterialProvider.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "Amplitude.Density": {
    "nodeKind": "Amplitude.Density",
    "title": "[DEPRECATED] Amplitude Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "DensityInputs",
        "label": "Inputs",
        "type": "Density.Connection",
        "multiple": true
      },
      {
        "id": "FunctionForY",
        "label": "FunctionForY",
        "type": "FunctionForY.Connection",
        "multiple": false
      }
    ]
  },
  "AmplitudeConstant.Density": {
    "nodeKind": "AmplitudeConstant.Density",
    "title": "[DEPRECATED] AmplitudeConstant Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "Value",
        "jsonKey": "Value",
        "renderer": "Float",
        "label": "Value",
        "requestedWidth": 100
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "DensityInputs",
        "label": "Inputs",
        "type": "Density.Connection",
        "multiple": true
      }
    ]
  },
  "Anchor.Density": {
    "nodeKind": "Anchor.Density",
    "title": "Anchor Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "Reversed",
        "jsonKey": "Reversed",
        "renderer": "Checkbox",
        "label": "Reversed"
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "DensityInputs",
        "label": "Inputs",
        "type": "Density.Connection",
        "multiple": true
      }
    ]
  },
  "Anchor.Positions": {
    "nodeKind": "Anchor.Positions",
    "title": "Anchor Positions",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "Reversed",
        "jsonKey": "Reversed",
        "renderer": "Checkbox",
        "label": "Reversed"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Positions.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Positions",
        "label": "Positions",
        "type": "Positions.Connection",
        "multiple": false
      }
    ]
  },
  "Anchor.PropDistribution": {
    "nodeKind": "Anchor.PropDistribution",
    "title": "Anchor PropDistribution",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Reversed",
        "jsonKey": "Reversed",
        "renderer": "Checkbox",
        "label": "Reversed"
      }
    ],
    "leftPins": [
      {
        "id": "OutputPin",
        "label": "",
        "type": "PropDistribution.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "PropDistribution",
        "label": "PropDistribution",
        "type": "PropDistribution.Connection",
        "multiple": false
      }
    ]
  },
  "And.Condition.SpaceAndDepth.MaterialProvider": {
    "nodeKind": "And.Condition.SpaceAndDepth.MaterialProvider",
    "title": "And Condition SADMP",
    "fields": [],
    "leftPins": [
      {
        "id": "OutputPin",
        "label": "",
        "type": "Condition.SpaceAndDepth.MaterialProvider.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "ConditionsPin",
        "label": "Conditions",
        "type": "Condition.SpaceAndDepth.MaterialProvider.Connection",
        "multiple": true
      }
    ]
  },
  "And.ContentPredicate": {
    "nodeKind": "And.ContentPredicate",
    "title": "[DEV] And ContentPredicate",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "ContentPredicate.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "ContentPredicates",
        "label": "ContentPredicates",
        "type": "ContentPredicate.Connection",
        "multiple": true
      }
    ]
  },
  "And.Density": {
    "nodeKind": "And.Density",
    "title": "And Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "DensityInputs",
        "label": "Inputs",
        "type": "Density.Connection",
        "multiple": true
      }
    ]
  },
  "And.EdgeSelector": {
    "nodeKind": "And.EdgeSelector",
    "title": "[DEV] And EdgeSelector",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "EdgeSelector.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "EdgeSelectors",
        "label": "EdgeSelectors",
        "type": "EdgeSelector.Connection",
        "multiple": true
      }
    ]
  },
  "And.NodeSelector": {
    "nodeKind": "And.NodeSelector",
    "title": "[DEV] And NodeSelector",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "NodeSelector.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "NodeSelectors",
        "label": "NodeSelectors",
        "type": "NodeSelector.Connection",
        "multiple": true
      }
    ]
  },
  "And.Pattern": {
    "nodeKind": "And.Pattern",
    "title": "And Pattern",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Pattern.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Patterns",
        "label": "Patterns",
        "type": "Pattern.Connection",
        "multiple": true
      }
    ]
  },
  "Angle.Density": {
    "nodeKind": "Angle.Density",
    "title": "Angle Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "IsAxis",
        "jsonKey": "IsAxis",
        "renderer": "Checkbox",
        "label": "IsAxis"
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Vector",
        "label": "Vector",
        "type": "Decimal.Vector3d.Connection",
        "multiple": false
      },
      {
        "id": "VectorProvider",
        "label": "VectorProvider",
        "type": "VectorProvider.Connection",
        "multiple": false
      }
    ]
  },
  "Angle.EdgeSelector": {
    "nodeKind": "Angle.EdgeSelector",
    "title": "[DEV] Angle EdgeSelector",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "EdgeSelector.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Reference",
        "label": "Reference",
        "type": "VectorProvider.Connection",
        "multiple": false
      },
      {
        "id": "Delimiters",
        "label": "Delimiters",
        "type": "Decimal.Range.Connection",
        "multiple": true
      }
    ]
  },
  "Area.Scanner": {
    "nodeKind": "Area.Scanner",
    "title": "[DEPRECATED] Area Scanner",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "ScanRange",
        "jsonKey": "ScanRange",
        "renderer": "Int",
        "label": "ScanRange"
      },
      {
        "id": "ScanShape",
        "jsonKey": "ScanShape",
        "renderer": "SmallString",
        "label": "ScanShape",
        "requestedWidth": 150
      },
      {
        "id": "ResultCap",
        "jsonKey": "ResultCap",
        "renderer": "Int",
        "label": "ResultCap"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Scanner.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "ChildScanner",
        "label": "ChildScanner",
        "type": "Scanner.Connection",
        "multiple": false
      }
    ]
  },
  "Assigned.PropDistribution": {
    "nodeKind": "Assigned.PropDistribution",
    "title": "Assigned PropDistribution",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "OverrideAllProps",
        "jsonKey": "OverrideAllProps",
        "renderer": "Checkbox",
        "label": "OverrideAllProps"
      }
    ],
    "leftPins": [
      {
        "id": "OutputPin",
        "label": "",
        "type": "PropDistribution.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "PropDistribution",
        "label": "PropDistribution",
        "type": "PropDistribution.Connection",
        "multiple": false
      },
      {
        "id": "Assignments",
        "label": "Assignments",
        "type": "Assignments.Connection",
        "multiple": false
      }
    ]
  },
  "Axis.Density": {
    "nodeKind": "Axis.Density",
    "title": "Axis Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "IsAnchored",
        "jsonKey": "IsAnchored",
        "renderer": "Checkbox",
        "label": "IsAnchored"
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Curve",
        "label": "Curve",
        "type": "Curve.Connection",
        "multiple": false
      },
      {
        "id": "Axis",
        "label": "Axis",
        "type": "Decimal.Vector3d.Connection",
        "multiple": false
      }
    ]
  },
  "BaseHeight.Density": {
    "nodeKind": "BaseHeight.Density",
    "title": "BaseHeight Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "BaseHeightName",
        "jsonKey": "BaseHeightName",
        "renderer": "SmallString",
        "label": "BaseHeightName",
        "requestedWidth": 250
      },
      {
        "id": "Distance",
        "jsonKey": "Distance",
        "renderer": "Checkbox",
        "label": "Distance"
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "BaseHeight.Positions": {
    "nodeKind": "BaseHeight.Positions",
    "title": "BaseHeight Positions",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "BedName",
        "jsonKey": "BedName",
        "renderer": "SmallString",
        "label": "BaseHeightName",
        "requestedWidth": 250
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Positions.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Positions.Connection",
        "label": "Positions",
        "type": "Positions.Connection",
        "multiple": false
      }
    ]
  },
  "Biome": {
    "nodeKind": "Biome",
    "title": "Biome",
    "fields": [
      {
        "id": "Name",
        "jsonKey": "Name",
        "renderer": "SmallString",
        "label": "Name",
        "requestedWidth": 350
      },
      {
        "id": "Tags",
        "jsonKey": "Tags",
        "renderer": "TagMap",
        "label": "Tags"
      }
    ],
    "leftPins": [],
    "rightPins": [
      {
        "id": "TerrainPin",
        "label": "Terrain",
        "type": "Terrain.Biome.Connection",
        "multiple": false
      },
      {
        "id": "MaterialProviderPin",
        "label": "MaterialProvider",
        "type": "MaterialProvider.Connection",
        "multiple": false
      },
      {
        "id": "PropsPin",
        "label": "Props",
        "type": "Runtime.Connection",
        "multiple": true
      },
      {
        "id": "EnvironmentProviderPin",
        "label": "EnvironmentProvider",
        "type": "EnvironmentProvider.Connection",
        "multiple": false
      },
      {
        "id": "TintProviderPin",
        "label": "TintProvider",
        "type": "TintProvider.Connection",
        "multiple": false
      }
    ]
  },
  "Block.Column.Prop": {
    "nodeKind": "Block.Column.Prop",
    "title": "Column Block",
    "fields": [
      {
        "id": "Y",
        "jsonKey": "Y",
        "renderer": "Int",
        "label": "Y",
        "requestedWidth": 50
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Block.Column.Prop.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Material",
        "label": "Material",
        "type": "Material.Connection",
        "multiple": false
      }
    ]
  },
  "Block.Manual.Prop": {
    "nodeKind": "Block.Manual.Prop",
    "title": "Block - Manual Prop",
    "fields": [],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Block.Manual.Prop.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Material",
        "label": "Material",
        "type": "Material.Connection",
        "multiple": false
      },
      {
        "id": "Position",
        "label": "Position",
        "type": "Integer.Vector3d.Connection",
        "multiple": false
      }
    ]
  },
  "BlockMask": {
    "nodeKind": "BlockMask",
    "title": "BlockMask",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Import",
        "jsonKey": "Import",
        "renderer": "SmallString",
        "label": "Import",
        "requestedWidth": 250
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "BlockMask.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "DontPlace",
        "label": "DontPlace",
        "type": "BlockSet.BlockMask.Connection",
        "multiple": false
      },
      {
        "id": "DontReplace",
        "label": "DontReplace",
        "type": "BlockSet.BlockMask.Connection",
        "multiple": false
      },
      {
        "id": "Advanced",
        "label": "Advanced",
        "type": "Rule.BlockMask.Connection",
        "multiple": true
      }
    ]
  },
  "BlockSet.BlockMask": {
    "nodeKind": "BlockSet.BlockMask",
    "title": "BlockSet BlockMask",
    "fields": [
      {
        "id": "Inclusive",
        "jsonKey": "Inclusive",
        "renderer": "Checkbox",
        "label": "Inclusive"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "BlockSet.BlockMask.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Materials",
        "label": "Materials",
        "type": "Material.Connection",
        "multiple": true
      }
    ]
  },
  "BlockSet.Pattern": {
    "nodeKind": "BlockSet.Pattern",
    "title": "BlockSet Pattern",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Pattern.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "BlockSet",
        "label": "BlockSet",
        "type": "BlockSet.BlockMask.Connection",
        "multiple": false
      }
    ]
  },
  "BlockType.Pattern": {
    "nodeKind": "BlockType.Pattern",
    "title": "BlockType Pattern",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Pattern.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Material",
        "label": "Material",
        "type": "Material.Connection",
        "multiple": false
      }
    ]
  },
  "Bound.Positions": {
    "nodeKind": "Bound.Positions",
    "title": "Bound Positions",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Positions.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Positions",
        "label": "Positions",
        "type": "Positions.Connection",
        "multiple": false
      },
      {
        "id": "Bounds",
        "label": "Bounds",
        "type": "Decimal.Bounds3d.Connection",
        "multiple": false
      }
    ]
  },
  "Box.Prop": {
    "nodeKind": "Box.Prop",
    "title": "[DEPRECATED] Box Prop",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Prop.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Pattern",
        "label": "Pattern",
        "type": "Pattern.Connection",
        "multiple": false
      },
      {
        "id": "Scanner",
        "label": "Scanner",
        "type": "Scanner.Connection",
        "multiple": false
      },
      {
        "id": "Range",
        "label": "Range",
        "type": "Decimal.Vector3d.Connection",
        "multiple": false
      },
      {
        "id": "Material",
        "label": "Material",
        "type": "Material.Connection",
        "multiple": false
      }
    ]
  },
  "Cache.Density": {
    "nodeKind": "Cache.Density",
    "title": "Cache Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "Capacity",
        "jsonKey": "Capacity",
        "renderer": "Int",
        "label": "Capacity"
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "DensityInputs",
        "label": "Inputs",
        "type": "Density.Connection",
        "multiple": true
      }
    ]
  },
  "Cache.Positions": {
    "nodeKind": "Cache.Positions",
    "title": "Cache Positions",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "SectionsSize",
        "jsonKey": "SectionsSize",
        "renderer": "Int",
        "label": "SectionsSize",
        "requestedWidth": 50
      },
      {
        "id": "CacheSize",
        "jsonKey": "CacheSize",
        "renderer": "Int",
        "label": "CacheSize",
        "requestedWidth": 50
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Positions.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Positions.Connection",
        "label": "Positions",
        "type": "Positions.Connection",
        "multiple": false
      }
    ]
  },
  "Cache.VectorProvider": {
    "nodeKind": "Cache.VectorProvider",
    "title": "Cache VectorProvider",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "VectorProvider.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Vector",
        "label": "Vector",
        "type": "VectorProvider.Connection",
        "multiple": false
      }
    ]
  },
  "Case.Switch.Density": {
    "nodeKind": "Case.Switch.Density",
    "title": "Switch Case",
    "fields": [
      {
        "id": "CaseState",
        "jsonKey": "CaseState",
        "renderer": "SmallString",
        "label": "CaseState",
        "requestedWidth": 250
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Case.Switch.Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Density",
        "label": "Density",
        "type": "Density.Connection",
        "multiple": false
      }
    ]
  },
  "Ceiling.Curve": {
    "nodeKind": "Ceiling.Curve",
    "title": "Ceiling Curve",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Ceiling_",
        "jsonKey": "Ceiling_",
        "renderer": "Float",
        "label": "Ceiling",
        "requestedWidth": 100
      }
    ],
    "leftPins": [
      {
        "id": "Input",
        "label": "",
        "type": "Curve.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Curve",
        "label": "Curve",
        "type": "Curve.Connection",
        "multiple": false
      }
    ]
  },
  "Ceiling.Density": {
    "nodeKind": "Ceiling.Density",
    "title": "[DEPRECATED] Ceiling Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "Limit",
        "jsonKey": "Limit",
        "renderer": "Float",
        "label": "Limit",
        "requestedWidth": 100
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "DensityInputs",
        "label": "Inputs",
        "type": "Density.Connection",
        "multiple": true
      }
    ]
  },
  "Ceiling.Pattern": {
    "nodeKind": "Ceiling.Pattern",
    "title": "Ceiling Pattern",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Pattern.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Ceiling",
        "label": "Ceiling",
        "type": "Pattern.Connection",
        "multiple": false
      },
      {
        "id": "Origin",
        "label": "Origin",
        "type": "Pattern.Connection",
        "multiple": false
      }
    ]
  },
  "CellNoise2D.Density": {
    "nodeKind": "CellNoise2D.Density",
    "title": "CellNoise2D Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "Jitter",
        "jsonKey": "Jitter",
        "renderer": "Float",
        "label": "Jitter",
        "requestedWidth": 100
      },
      {
        "id": "CellType",
        "jsonKey": "CellType",
        "renderer": "Enum",
        "label": "CellType",
        "requestedWidth": 150
      },
      {
        "id": "ScaleX",
        "jsonKey": "ScaleX",
        "renderer": "Float",
        "label": "ScaleX",
        "requestedWidth": 100
      },
      {
        "id": "ScaleZ",
        "jsonKey": "ScaleZ",
        "renderer": "Float",
        "label": "ScaleZ",
        "requestedWidth": 100
      },
      {
        "id": "Octaves",
        "jsonKey": "Octaves",
        "renderer": "IntSlider",
        "label": "Octaves",
        "requestedWidth": 150
      },
      {
        "id": "Seed",
        "jsonKey": "Seed",
        "renderer": "SmallString",
        "label": "Seed",
        "requestedWidth": 350
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "CellNoise3D.Density": {
    "nodeKind": "CellNoise3D.Density",
    "title": "CellNoise3D Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "Jitter",
        "jsonKey": "Jitter",
        "renderer": "Float",
        "label": "Jitter",
        "requestedWidth": 100
      },
      {
        "id": "CellType",
        "jsonKey": "CellType",
        "renderer": "Enum",
        "label": "CellType",
        "requestedWidth": 150
      },
      {
        "id": "ScaleX",
        "jsonKey": "ScaleX",
        "renderer": "Float",
        "label": "ScaleX",
        "requestedWidth": 100
      },
      {
        "id": "ScaleY",
        "jsonKey": "ScaleY",
        "renderer": "Float",
        "label": "ScaleY",
        "requestedWidth": 100
      },
      {
        "id": "ScaleZ",
        "jsonKey": "ScaleZ",
        "renderer": "Float",
        "label": "ScaleZ",
        "requestedWidth": 100
      },
      {
        "id": "Octaves",
        "jsonKey": "Octaves",
        "renderer": "IntSlider",
        "label": "Octaves",
        "requestedWidth": 150
      },
      {
        "id": "Seed",
        "jsonKey": "Seed",
        "renderer": "SmallString",
        "label": "Seed",
        "requestedWidth": 350
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "CellValue.ReturnType.PositionsCellNoise.Density": {
    "nodeKind": "CellValue.ReturnType.PositionsCellNoise.Density",
    "title": "CellValue ReturnType",
    "fields": [
      {
        "id": "DefaultValue",
        "jsonKey": "DefaultValue",
        "renderer": "Float",
        "label": "DefaultValue",
        "requestedWidth": 100
      }
    ],
    "leftPins": [
      {
        "id": "PCN",
        "label": "",
        "type": "ReturnType.PositionsCellNoise.Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Density",
        "label": "Density",
        "type": "Density.Connection",
        "multiple": false
      }
    ]
  },
  "CellWallDistance.Density": {
    "nodeKind": "CellWallDistance.Density",
    "title": "[EXPERIMENTAL] CellWallDistance Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "Clamp.Curve": {
    "nodeKind": "Clamp.Curve",
    "title": "Clamp Curve",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "WallA",
        "jsonKey": "WallA",
        "renderer": "Float",
        "label": "WallA",
        "requestedWidth": 100
      },
      {
        "id": "WallB",
        "jsonKey": "WallB",
        "renderer": "Float",
        "label": "WallB",
        "requestedWidth": 100
      }
    ],
    "leftPins": [
      {
        "id": "Input",
        "label": "",
        "type": "Curve.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Curve",
        "label": "Curve",
        "type": "Curve.Connection",
        "multiple": false
      }
    ]
  },
  "Clamp.Density": {
    "nodeKind": "Clamp.Density",
    "title": "Clamp Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "WallA",
        "jsonKey": "WallA",
        "renderer": "Float",
        "label": "WallA",
        "requestedWidth": 100
      },
      {
        "id": "WallB",
        "jsonKey": "WallB",
        "renderer": "Float",
        "label": "WallB",
        "requestedWidth": 100
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "DensityInputs",
        "label": "Inputs",
        "type": "Density.Connection",
        "multiple": true
      }
    ]
  },
  "Cluster.Prop": {
    "nodeKind": "Cluster.Prop",
    "title": "[DEPRECATED] Cluster Prop",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "Range",
        "jsonKey": "Range",
        "renderer": "Int",
        "label": "Range",
        "requestedWidth": 50
      },
      {
        "id": "Seed",
        "jsonKey": "Seed",
        "renderer": "SmallString",
        "label": "Seed",
        "requestedWidth": 350
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Prop.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "DistanceCurve",
        "label": "DistanceCurve",
        "type": "Manual.Curve.Connection",
        "multiple": false
      },
      {
        "id": "WeightedProps",
        "label": "WeightedProps",
        "type": "Weighted.Cluster.Prop.Connection",
        "multiple": true
      },
      {
        "id": "Pattern",
        "label": "Pattern",
        "type": "Pattern.Connection",
        "multiple": false
      },
      {
        "id": "Scanner",
        "label": "Scanner",
        "type": "Scanner.Connection",
        "multiple": false
      }
    ]
  },
  "Clusters.Positions": {
    "nodeKind": "Clusters.Positions",
    "title": "Clusters Positions",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Positions.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Cluster",
        "label": "Cluster",
        "type": "Positions.Connection",
        "multiple": false
      },
      {
        "id": "Distributor",
        "label": "Distributor",
        "type": "Positions.Connection",
        "multiple": false
      },
      {
        "id": "ClusterBounds",
        "label": "ClusterBounds",
        "type": "Decimal.Bounds3d.Connection",
        "multiple": false
      }
    ]
  },
  "Column.Prop": {
    "nodeKind": "Column.Prop",
    "title": "[DEPRECATED] Column Prop",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Prop.Connection",
        "multiple": false
      },
      {
        "id": "Restricted.Output",
        "label": "",
        "type": "Column.Prop.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "ColumnBlocks",
        "label": "ColumnBlocks",
        "type": "Block.Column.Prop.Connection",
        "multiple": true
      },
      {
        "id": "Directionality",
        "label": "Directionality",
        "type": "Directionality.Connection",
        "multiple": false
      },
      {
        "id": "Scanner",
        "label": "Scanner",
        "type": "Scanner.Connection",
        "multiple": false
      },
      {
        "id": "BlockMask",
        "label": "BlockMask",
        "type": "BlockMask.Connection",
        "multiple": false
      }
    ]
  },
  "ColumnLinear.Scanner": {
    "nodeKind": "ColumnLinear.Scanner",
    "title": "[DEPRECATED] ColumnLinear Scanner",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "MaxY",
        "jsonKey": "MaxY",
        "renderer": "Int",
        "label": "MaxY"
      },
      {
        "id": "MinY",
        "jsonKey": "MinY",
        "renderer": "Int",
        "label": "MinY"
      },
      {
        "id": "RelativeToPosition",
        "jsonKey": "RelativeToPosition",
        "renderer": "Checkbox",
        "label": "RelativeToPosition"
      },
      {
        "id": "BaseHeightName",
        "jsonKey": "BaseHeightName",
        "renderer": "SmallString",
        "label": "BaseHeightName",
        "requestedWidth": 250
      },
      {
        "id": "TopDownOrder",
        "jsonKey": "TopDownOrder",
        "renderer": "Checkbox",
        "label": "TopDownOrder"
      },
      {
        "id": "ResultCap",
        "jsonKey": "ResultCap",
        "renderer": "Int",
        "label": "ResultCap"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Scanner.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "ColumnRandom.Scanner": {
    "nodeKind": "ColumnRandom.Scanner",
    "title": "[DEPRECATED] ColumnRandom Scanner",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "MaxY",
        "jsonKey": "MaxY",
        "renderer": "Int",
        "label": "MaxY"
      },
      {
        "id": "MinY",
        "jsonKey": "MinY",
        "renderer": "Int",
        "label": "MinY"
      },
      {
        "id": "Strategy",
        "jsonKey": "Strategy",
        "renderer": "SmallString",
        "label": "Strategy",
        "requestedWidth": 150
      },
      {
        "id": "Seed",
        "jsonKey": "Seed",
        "renderer": "SmallString",
        "label": "Seed",
        "requestedWidth": 350
      },
      {
        "id": "RelativeToPosition",
        "jsonKey": "RelativeToPosition",
        "renderer": "Checkbox",
        "label": "RelativeToPosition"
      },
      {
        "id": "BaseHeightName",
        "jsonKey": "BaseHeightName",
        "renderer": "SmallString",
        "label": "BaseHeightName",
        "requestedWidth": 250
      },
      {
        "id": "ResultCap",
        "jsonKey": "ResultCap",
        "renderer": "Int",
        "label": "ResultCap"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Scanner.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "Comparator.Density": {
    "nodeKind": "Comparator.Density",
    "title": "Comparator Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "DensityInputs",
        "label": "Inputs",
        "type": "Density.Connection",
        "multiple": true
      }
    ]
  },
  "ConnectedEdges.NodeAction": {
    "nodeKind": "ConnectedEdges.NodeAction",
    "title": "[DEV] ConnectedEdges NodeAction",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "Seed",
        "jsonKey": "Seed",
        "renderer": "SmallString",
        "label": "Seed",
        "requestedWidth": 350
      },
      {
        "id": "Ratio",
        "jsonKey": "Ratio",
        "renderer": "Float",
        "label": "Ratio",
        "requestedWidth": 150
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "NodeAction.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "EdgeAction",
        "label": "EdgeAction",
        "type": "EdgeAction.Connection",
        "multiple": false
      }
    ]
  },
  "ConnectedNodes.NodeAction": {
    "nodeKind": "ConnectedNodes.NodeAction",
    "title": "[DEV] ConnectedNodes NodeAction",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "Seed",
        "jsonKey": "Seed",
        "renderer": "SmallString",
        "label": "Seed",
        "requestedWidth": 350
      },
      {
        "id": "Ratio",
        "jsonKey": "Ratio",
        "renderer": "Float",
        "label": "Ratio",
        "requestedWidth": 150
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "NodeAction.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "NodeAction",
        "label": "NodeAction",
        "type": "NodeAction.Connection",
        "multiple": false
      }
    ]
  },
  "ConnectionCount.NodeSelector": {
    "nodeKind": "ConnectionCount.NodeSelector",
    "title": "[DEV] ConnectionCount NodeSelector",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "Counts",
        "jsonKey": "Counts",
        "renderer": "List",
        "label": "Connections",
        "requestedWidth": 100,
        "itemType": "Int"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "NodeSelector.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "Constant.Assignments": {
    "nodeKind": "Constant.Assignments",
    "title": "Constant Assignments",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Assignments.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Prop",
        "label": "Prop",
        "type": "Prop.Connection",
        "multiple": false
      }
    ]
  },
  "Constant.ContentPredicate": {
    "nodeKind": "Constant.ContentPredicate",
    "title": "[DEV] Constant ContentPredicate",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "Value",
        "jsonKey": "Value",
        "renderer": "Checkbox",
        "label": "Value"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "ContentPredicate.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "Constant.ContentSupplier": {
    "nodeKind": "Constant.ContentSupplier",
    "title": "[DEV] Constant ContentSupplier",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "ContentSupplier.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Content",
        "label": "Content",
        "type": "NodeContent.Graph.Connection",
        "multiple": false
      }
    ]
  },
  "Constant.Curve": {
    "nodeKind": "Constant.Curve",
    "title": "Constant Curve",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Value",
        "jsonKey": "Value",
        "renderer": "Float",
        "label": "Value",
        "requestedWidth": 100
      }
    ],
    "leftPins": [
      {
        "id": "Input",
        "label": "",
        "type": "Curve.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "Constant.Density": {
    "nodeKind": "Constant.Density",
    "title": "Constant Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "Value",
        "jsonKey": "Value",
        "renderer": "Float",
        "label": "Value",
        "requestedWidth": 100
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "Constant.EnvironmentProvider": {
    "nodeKind": "Constant.EnvironmentProvider",
    "title": "Constant EnvironmentProvider",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "Environment",
        "jsonKey": "Environment",
        "renderer": "SmallString",
        "label": "Environment",
        "requestedWidth": 150
      }
    ],
    "leftPins": [
      {
        "id": "OutputPin",
        "label": "",
        "type": "EnvironmentProvider.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "Constant.MaterialProvider": {
    "nodeKind": "Constant.MaterialProvider",
    "title": "Constant MaterialProvider",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "OutputPin",
        "label": "",
        "type": "MaterialProvider.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Material",
        "label": "Material",
        "type": "Material.Connection",
        "multiple": false
      }
    ]
  },
  "Constant.Pattern": {
    "nodeKind": "Constant.Pattern",
    "title": "Constant Pattern",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "Value",
        "jsonKey": "Value",
        "renderer": "Checkbox",
        "label": "Value"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Pattern.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "Constant.PropDistribution": {
    "nodeKind": "Constant.PropDistribution",
    "title": "Constant PropDistribution",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "OutputPin",
        "label": "",
        "type": "PropDistribution.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Positions",
        "label": "Positions",
        "type": "Positions.Connection",
        "multiple": false
      },
      {
        "id": "Prop",
        "label": "Prop",
        "type": "Prop.Connection",
        "multiple": false
      }
    ]
  },
  "Constant.TintProvider": {
    "nodeKind": "Constant.TintProvider",
    "title": "Constant TintProvider",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "Color",
        "jsonKey": "Color",
        "renderer": "SmallString",
        "label": "Color",
        "requestedWidth": 150
      }
    ],
    "leftPins": [
      {
        "id": "OutputPin",
        "label": "",
        "type": "TintProvider.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "Constant.VectorProvider": {
    "nodeKind": "Constant.VectorProvider",
    "title": "Constant VectorProvider",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "VectorProvider.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Vector",
        "label": "Vector",
        "type": "Decimal.Vector3d.Connection",
        "multiple": false
      }
    ]
  },
  "ConstantThickness.Layer.SpaceAndDepth.MaterialProvider": {
    "nodeKind": "ConstantThickness.Layer.SpaceAndDepth.MaterialProvider",
    "title": "ConstantThickness Layer SADMP",
    "fields": [
      {
        "id": "Thickness",
        "jsonKey": "Thickness",
        "renderer": "Int",
        "label": "Thickness",
        "requestedWidth": 50
      }
    ],
    "leftPins": [
      {
        "id": "OutputPin",
        "label": "",
        "type": "Layer.SpaceAndDepth.MaterialProvider.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "MaterialPin",
        "label": "Material",
        "type": "MaterialProvider.Connection",
        "multiple": false
      }
    ]
  },
  "Content.NodeAction": {
    "nodeKind": "Content.NodeAction",
    "title": "[DEV] Content NodeAction",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "NodeAction.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Content",
        "label": "Content",
        "type": "ContentSupplier.Connection",
        "multiple": false
      }
    ]
  },
  "Content.NodeSelector": {
    "nodeKind": "Content.NodeSelector",
    "title": "[DEV] Content NodeSelector",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "NodeSelector.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "ContentPredicate",
        "label": "ContentPredicate",
        "type": "ContentPredicate.Connection",
        "multiple": false
      }
    ]
  },
  "ContentCopy.NodeAction": {
    "nodeKind": "ContentCopy.NodeAction",
    "title": "[DEV] ContentCopy NodeAction",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "Seed",
        "jsonKey": "Seed",
        "renderer": "SmallString",
        "label": "Seed",
        "requestedWidth": 350
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "NodeAction.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "ContentPredicate",
        "label": "ContentPredicate",
        "type": "ContentPredicate.Connection",
        "multiple": false
      }
    ]
  },
  "Cross.VectorProvider": {
    "nodeKind": "Cross.VectorProvider",
    "title": "Cross VectorProvider",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "VectorProvider.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "VectorA",
        "label": "VectorA",
        "type": "VectorProvider.Connection",
        "multiple": false
      },
      {
        "id": "VectorB",
        "label": "VectorB",
        "type": "VectorProvider.Connection",
        "multiple": false
      }
    ]
  },
  "Cube.Density": {
    "nodeKind": "Cube.Density",
    "title": "Cube Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Curve",
        "label": "Curve",
        "type": "Curve.Connection",
        "multiple": false
      }
    ]
  },
  "Cuboid.Density": {
    "nodeKind": "Cuboid.Density",
    "title": "Cuboid Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "Spin",
        "jsonKey": "Spin",
        "renderer": "Float",
        "label": "Spin"
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Curve",
        "label": "Curve",
        "type": "Curve.Connection",
        "multiple": false
      },
      {
        "id": "Scale",
        "label": "Scale",
        "type": "Decimal.Vector3d.Connection",
        "multiple": false
      },
      {
        "id": "NewYAxis",
        "label": "NewYAxis",
        "type": "Decimal.Vector3d.Connection",
        "multiple": false
      }
    ]
  },
  "Cuboid.Pattern": {
    "nodeKind": "Cuboid.Pattern",
    "title": "Cuboid Pattern",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Pattern.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Max",
        "label": "Max",
        "type": "Decimal.Vector3d.Connection",
        "multiple": false
      },
      {
        "id": "Min",
        "label": "Min",
        "type": "Decimal.Vector3d.Connection",
        "multiple": false
      },
      {
        "id": "SubPattern",
        "label": "SubPattern",
        "type": "Pattern.Connection",
        "multiple": false
      }
    ]
  },
  "Cuboid.Prop": {
    "nodeKind": "Cuboid.Prop",
    "title": "Cuboid Prop",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Prop.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Bounds",
        "label": "Bounds",
        "type": "Integer.Bounds3d.Connection",
        "multiple": false
      },
      {
        "id": "Material",
        "label": "Material",
        "type": "MaterialProvider.Connection",
        "multiple": false
      }
    ]
  },
  "Curve.ReturnType.PositionsCellNoise.Density": {
    "nodeKind": "Curve.ReturnType.PositionsCellNoise.Density",
    "title": "Curve ReturnType",
    "fields": [],
    "leftPins": [
      {
        "id": "PCN",
        "label": "",
        "type": "ReturnType.PositionsCellNoise.Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Curve",
        "label": "Curve",
        "type": "Curve.Connection",
        "multiple": false
      }
    ]
  },
  "CurveMapper.Density": {
    "nodeKind": "CurveMapper.Density",
    "title": "CurveMapper Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "DensityInputs",
        "label": "Inputs",
        "type": "Density.Connection",
        "multiple": true
      },
      {
        "id": "Curve",
        "label": "Curve",
        "type": "Curve.Connection",
        "multiple": false
      }
    ]
  },
  "CurvePoint.Curve": {
    "nodeKind": "CurvePoint.Curve",
    "title": "Curve Point",
    "fields": [
      {
        "id": "In",
        "jsonKey": "In",
        "renderer": "Float",
        "label": "In",
        "requestedWidth": 100
      },
      {
        "id": "Out",
        "jsonKey": "Out",
        "renderer": "Float",
        "label": "Out",
        "requestedWidth": 100
      }
    ],
    "leftPins": [
      {
        "id": "Input",
        "label": "",
        "type": "CurvePoint.Curve.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "Cylinder.Density": {
    "nodeKind": "Cylinder.Density",
    "title": "Cylinder Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "Spin",
        "jsonKey": "Spin",
        "renderer": "Float",
        "label": "Spin"
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "AxialCurve",
        "label": "AxialCurve",
        "type": "Curve.Connection",
        "multiple": false
      },
      {
        "id": "RadialCurve",
        "label": "RadialCurve",
        "type": "Curve.Connection",
        "multiple": false
      },
      {
        "id": "NewYAxis",
        "label": "NewYAxis",
        "type": "Decimal.Vector3d.Connection",
        "multiple": false
      }
    ]
  },
  "Decimal.Bounds3d": {
    "nodeKind": "Decimal.Bounds3d",
    "title": "Decimal Bounds 3D",
    "fields": [],
    "leftPins": [
      {
        "id": "Input",
        "label": "",
        "type": "Decimal.Bounds3d.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "PointA",
        "label": "PointA",
        "type": "Decimal.Vector3d.Connection",
        "multiple": false
      },
      {
        "id": "PointB",
        "label": "PointB",
        "type": "Decimal.Vector3d.Connection",
        "multiple": false
      }
    ]
  },
  "Decimal.Range": {
    "nodeKind": "Decimal.Range",
    "title": "Decimal Range",
    "fields": [
      {
        "id": "MinInclusive",
        "jsonKey": "MinInclusive",
        "renderer": "Float",
        "label": "MinInclusive",
        "requestedWidth": 50
      },
      {
        "id": "MaxExclusive",
        "jsonKey": "MaxExclusive",
        "renderer": "Float",
        "label": "MaxExclusive",
        "requestedWidth": 50
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Decimal.Range.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "Decimal.Vector3d": {
    "nodeKind": "Decimal.Vector3d",
    "title": "Decimal 3D Vector",
    "fields": [
      {
        "id": "X",
        "jsonKey": "X",
        "renderer": "Float",
        "label": "X",
        "requestedWidth": 100
      },
      {
        "id": "Y",
        "jsonKey": "Y",
        "renderer": "Float",
        "label": "Y",
        "requestedWidth": 100
      },
      {
        "id": "Z",
        "jsonKey": "Z",
        "renderer": "Float",
        "label": "Z",
        "requestedWidth": 100
      }
    ],
    "leftPins": [
      {
        "id": "Decimal.Vector3d.Connection",
        "label": "",
        "type": "Decimal.Vector3d.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "Delete.EdgeAction": {
    "nodeKind": "Delete.EdgeAction",
    "title": "[DEV] Delete EdgeAction",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "EdgeAction.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "Delete.NodeAction": {
    "nodeKind": "Delete.NodeAction",
    "title": "[DEV] Delete NodeAction",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "NodeAction.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "Delimiter.Density.ReturnType.PositionsCellNoise.Density": {
    "nodeKind": "Delimiter.Density.ReturnType.PositionsCellNoise.Density",
    "title": "Delimiter",
    "fields": [
      {
        "id": "From",
        "jsonKey": "From",
        "renderer": "Float",
        "label": "From",
        "requestedWidth": 70
      },
      {
        "id": "To",
        "jsonKey": "To",
        "renderer": "Float",
        "label": "To",
        "requestedWidth": 70
      }
    ],
    "leftPins": [
      {
        "id": "Delimiter.Density.ReturnType.PositionsCellNoise.Density",
        "label": "",
        "type": "Delimiter.Density.ReturnType.PositionsCellNoise.Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Density",
        "label": "Density",
        "type": "Density.Connection",
        "multiple": false
      }
    ]
  },
  "Delimiter.DensityDelimited.EnvironmentProvider": {
    "nodeKind": "Delimiter.DensityDelimited.EnvironmentProvider",
    "title": "Delimiter DDEP",
    "fields": [],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Delimiter.DensityDelimited.EnvironmentProvider.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Environment",
        "label": "Environment",
        "type": "EnvironmentProvider.Connection",
        "multiple": false
      },
      {
        "id": "Range",
        "label": "Range",
        "type": "Decimal.Range.Connection",
        "multiple": false
      }
    ]
  },
  "Delimiter.DensityDelimited.TintProvider": {
    "nodeKind": "Delimiter.DensityDelimited.TintProvider",
    "title": "Delimiter DDTP",
    "fields": [],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Delimiter.DensityDelimited.TintProvider.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Tint",
        "label": "Tint",
        "type": "TintProvider.Connection",
        "multiple": false
      },
      {
        "id": "Range",
        "label": "Range",
        "type": "Decimal.Range.Connection",
        "multiple": false
      }
    ]
  },
  "Delimiter.DensitySelector.Prop": {
    "nodeKind": "Delimiter.DensitySelector.Prop",
    "title": "Delimiter - DensitySelector Prop",
    "fields": [],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Delimiter.DensitySelector.Prop.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Prop",
        "label": "Prop",
        "type": "Prop.Connection",
        "multiple": false
      },
      {
        "id": "Range",
        "label": "Range",
        "type": "Decimal.Range.Connection",
        "multiple": false
      }
    ]
  },
  "Delimiter.FieldFunction.Assignments": {
    "nodeKind": "Delimiter.FieldFunction.Assignments",
    "title": "FieldFunction Delimiter",
    "fields": [
      {
        "id": "Min",
        "jsonKey": "Min",
        "renderer": "Float",
        "label": "Min",
        "requestedWidth": 70
      },
      {
        "id": "Max",
        "jsonKey": "Max",
        "renderer": "Float",
        "label": "Max",
        "requestedWidth": 70
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Delimiter.FieldFunction.Assignments.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Assignments",
        "label": "Assignments",
        "type": "Assignments.Connection",
        "multiple": false
      }
    ]
  },
  "Delimiter.FieldFunction.MaterialProvider": {
    "nodeKind": "Delimiter.FieldFunction.MaterialProvider",
    "title": "Delimiter FFMP",
    "fields": [
      {
        "id": "From",
        "jsonKey": "From",
        "renderer": "Float",
        "label": "From",
        "requestedWidth": 50
      },
      {
        "id": "To",
        "jsonKey": "To",
        "renderer": "Float",
        "label": "To",
        "requestedWidth": 50
      }
    ],
    "leftPins": [
      {
        "id": "OutputPin",
        "label": "",
        "type": "Delimiter.FieldFunction.MaterialProvider.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "MaterialPin",
        "label": "Material",
        "type": "MaterialProvider.Connection",
        "multiple": false
      }
    ]
  },
  "Delimiter.FieldFunction.Pattern": {
    "nodeKind": "Delimiter.FieldFunction.Pattern",
    "title": "FieldFunction Delimiter",
    "fields": [
      {
        "id": "Min",
        "jsonKey": "Min",
        "renderer": "Float",
        "label": "Min",
        "requestedWidth": 70
      },
      {
        "id": "Max",
        "jsonKey": "Max",
        "renderer": "Float",
        "label": "Max",
        "requestedWidth": 70
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Delimiter.FieldFunction.Pattern.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "Delimiter.Positions": {
    "nodeKind": "Delimiter.Positions",
    "title": "Delimiter",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Min",
        "jsonKey": "Min",
        "renderer": "Float",
        "label": "Min",
        "requestedWidth": 100
      },
      {
        "id": "Max",
        "jsonKey": "Max",
        "renderer": "Float",
        "label": "Max",
        "requestedWidth": 100
      }
    ],
    "leftPins": [
      {
        "id": "Delimiter.Positions.Connection",
        "label": "",
        "type": "Delimiter.Positions.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "Delimiter.Sandwich.Assignments": {
    "nodeKind": "Delimiter.Sandwich.Assignments",
    "title": "Sandwich Delimiter",
    "fields": [
      {
        "id": "MinY",
        "jsonKey": "MinY",
        "renderer": "Float",
        "label": "MinY",
        "requestedWidth": 70
      },
      {
        "id": "MaxY",
        "jsonKey": "MaxY",
        "renderer": "Float",
        "label": "MaxY",
        "requestedWidth": 70
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Delimiter.Sandwich.Assignments.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Assignments",
        "label": "Assignments",
        "type": "Assignments.Connection",
        "multiple": false
      }
    ]
  },
  "Density.NodeContent": {
    "nodeKind": "Density.NodeContent",
    "title": "[DEV] Density NodeContent",
    "fields": [
      {
        "id": "ContentLayer",
        "jsonKey": "ContentLayer",
        "renderer": "SmallString",
        "label": "ContentLayer",
        "requestedWidth": 350
      },
      {
        "id": "Range",
        "jsonKey": "Range",
        "renderer": "Float",
        "label": "Range"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Density.NodeContent.Graph.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Density",
        "label": "Density",
        "type": "Density.Connection",
        "multiple": false
      }
    ]
  },
  "Density.Prop": {
    "nodeKind": "Density.Prop",
    "title": "Density Prop",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Prop.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Bounds",
        "label": "Bounds",
        "type": "Integer.Bounds3d.Connection",
        "multiple": false
      },
      {
        "id": "Density",
        "label": "Density",
        "type": "Density.Connection",
        "multiple": false
      },
      {
        "id": "Material",
        "label": "Material",
        "type": "MaterialProvider.Connection",
        "multiple": false
      },
      {
        "id": "Pattern",
        "label": "[DEPRECATED] Pattern",
        "type": "Pattern.Connection",
        "multiple": false
      },
      {
        "id": "Scanner",
        "label": "[DEPRECATED] Scanner",
        "type": "Scanner.Connection",
        "multiple": false
      },
      {
        "id": "PlacementMask",
        "label": "[DEPRECATED] PlacementMask",
        "type": "BlockMask.Connection",
        "multiple": false
      },
      {
        "id": "Range",
        "label": "[DEPRECATED] Range",
        "type": "Decimal.Vector3d.Connection",
        "multiple": false
      }
    ]
  },
  "Density.ReturnType.PositionsCellNoise.Density": {
    "nodeKind": "Density.ReturnType.PositionsCellNoise.Density",
    "title": "Density ReturnType",
    "fields": [
      {
        "id": "DefaultValue",
        "jsonKey": "DefaultValue",
        "renderer": "Float",
        "label": "DefaultValue",
        "requestedWidth": 100
      }
    ],
    "leftPins": [
      {
        "id": "PCN",
        "label": "",
        "type": "ReturnType.PositionsCellNoise.Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "ChoiceDensity",
        "label": "ChoiceDensity",
        "type": "Density.Connection",
        "multiple": false
      },
      {
        "id": "Delimiters",
        "label": "Delimiters",
        "type": "Delimiter.Density.ReturnType.PositionsCellNoise.Density.Connection",
        "multiple": true
      }
    ]
  },
  "DensityDelimited.EnvironmentProvider": {
    "nodeKind": "DensityDelimited.EnvironmentProvider",
    "title": "DensityDelimited EnvironmentProvider",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "EnvironmentProvider.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Density",
        "label": "Density",
        "type": "Density.Connection",
        "multiple": false
      },
      {
        "id": "Delimiters",
        "label": "Delimiters",
        "type": "Delimiter.DensityDelimited.EnvironmentProvider.Connection",
        "multiple": true
      }
    ]
  },
  "DensityDelimited.NodeSelector": {
    "nodeKind": "DensityDelimited.NodeSelector",
    "title": "[DEV] DensityDelimited NodeSelector",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "NodeSelector.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Density",
        "label": "Density",
        "type": "Density.Connection",
        "multiple": false
      },
      {
        "id": "Delimiters",
        "label": "Delimiters",
        "type": "Decimal.Range.Connection",
        "multiple": true
      }
    ]
  },
  "DensityDelimited.TintProvider": {
    "nodeKind": "DensityDelimited.TintProvider",
    "title": "DensityDelimited TintProvider",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "TintProvider.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Density",
        "label": "Density",
        "type": "Density.Connection",
        "multiple": false
      },
      {
        "id": "Delimiters",
        "label": "Delimiters",
        "type": "Delimiter.DensityDelimited.TintProvider.Connection",
        "multiple": true
      }
    ]
  },
  "DensityGradient.VectorProvider": {
    "nodeKind": "DensityGradient.VectorProvider",
    "title": "DensityGradient VectorProvider",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "SampleDistance",
        "jsonKey": "SampleDistance",
        "renderer": "Float",
        "label": "SampleDistance",
        "requestedWidth": 50
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "VectorProvider.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Density",
        "label": "Density",
        "type": "Density.Connection",
        "multiple": false
      }
    ]
  },
  "DensitySelector.Prop": {
    "nodeKind": "DensitySelector.Prop",
    "title": "DensitySelector Prop",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Prop.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Delimiters",
        "label": "Delimiters",
        "type": "Delimiter.DensitySelector.Prop.Connection",
        "multiple": true
      },
      {
        "id": "Density",
        "label": "Density",
        "type": "Density.Connection",
        "multiple": false
      }
    ]
  },
  "DirectionalJitter.Positions": {
    "nodeKind": "DirectionalJitter.Positions",
    "title": "DirectionalJitter Positions",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "Magnitude",
        "jsonKey": "Magnitude",
        "renderer": "Float",
        "label": "Magnitude",
        "requestedWidth": 50
      },
      {
        "id": "IsBidirectional",
        "jsonKey": "IsBidirectional",
        "renderer": "Checkbox",
        "label": "IsBidirectional"
      },
      {
        "id": "Seed",
        "jsonKey": "Seed",
        "renderer": "SmallString",
        "label": "Seed",
        "requestedWidth": 350
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Positions.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Direction",
        "label": "Direction",
        "type": "Decimal.Vector3d.Connection",
        "multiple": false
      },
      {
        "id": "Positions.Connection",
        "label": "Positions",
        "type": "Positions.Connection",
        "multiple": false
      }
    ]
  },
  "Distance.Density": {
    "nodeKind": "Distance.Density",
    "title": "Distance Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Curve",
        "label": "Curve",
        "type": "Curve.Connection",
        "multiple": false
      }
    ]
  },
  "Distance.ReturnType.PositionsCellNoise.Density": {
    "nodeKind": "Distance.ReturnType.PositionsCellNoise.Density",
    "title": "Distance ReturnType",
    "fields": [],
    "leftPins": [
      {
        "id": "PCN",
        "label": "",
        "type": "ReturnType.PositionsCellNoise.Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "Distance2.ReturnType.PositionsCellNoise.Density": {
    "nodeKind": "Distance2.ReturnType.PositionsCellNoise.Density",
    "title": "Distance2 ReturnType",
    "fields": [],
    "leftPins": [
      {
        "id": "PCN",
        "label": "",
        "type": "ReturnType.PositionsCellNoise.Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "Distance2Add.ReturnType.PositionsCellNoise.Density": {
    "nodeKind": "Distance2Add.ReturnType.PositionsCellNoise.Density",
    "title": "Distance2Add ReturnType",
    "fields": [],
    "leftPins": [
      {
        "id": "PCN",
        "label": "",
        "type": "ReturnType.PositionsCellNoise.Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "Distance2Div.ReturnType.PositionsCellNoise.Density": {
    "nodeKind": "Distance2Div.ReturnType.PositionsCellNoise.Density",
    "title": "Distance2Div ReturnType",
    "fields": [],
    "leftPins": [
      {
        "id": "PCN",
        "label": "",
        "type": "ReturnType.PositionsCellNoise.Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "Distance2Mul.ReturnType.PositionsCellNoise.Density": {
    "nodeKind": "Distance2Mul.ReturnType.PositionsCellNoise.Density",
    "title": "Distance2Mul ReturnType",
    "fields": [],
    "leftPins": [
      {
        "id": "PCN",
        "label": "",
        "type": "ReturnType.PositionsCellNoise.Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "Distance2Sub.ReturnType.PositionsCellNoise.Density": {
    "nodeKind": "Distance2Sub.ReturnType.PositionsCellNoise.Density",
    "title": "Distance2Sub ReturnType",
    "fields": [],
    "leftPins": [
      {
        "id": "PCN",
        "label": "",
        "type": "ReturnType.PositionsCellNoise.Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "DistanceExponential.Curve": {
    "nodeKind": "DistanceExponential.Curve",
    "title": "DistanceExponential Curve",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Exponent",
        "jsonKey": "Exponent",
        "renderer": "Float",
        "label": "Exponent",
        "requestedWidth": 100
      },
      {
        "id": "Range",
        "jsonKey": "Range",
        "renderer": "Float",
        "label": "Range",
        "requestedWidth": 100
      }
    ],
    "leftPins": [
      {
        "id": "Input",
        "label": "",
        "type": "Curve.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "DistanceFunction.PositionsCellNoise.Density": {
    "nodeKind": "DistanceFunction.PositionsCellNoise.Density",
    "title": "Distance Function",
    "fields": [
      {
        "id": "Type",
        "jsonKey": "Type",
        "renderer": "Enum",
        "label": "Type",
        "requestedWidth": 100
      }
    ],
    "leftPins": [
      {
        "id": "PCN",
        "label": "",
        "type": "DistanceFunction.PositionsCellNoise.Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "DistanceS.Curve": {
    "nodeKind": "DistanceS.Curve",
    "title": "DistanceS Curve",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "ExponentA",
        "jsonKey": "ExponentA",
        "renderer": "Float",
        "label": "ExponentA",
        "requestedWidth": 100
      },
      {
        "id": "ExponentB",
        "jsonKey": "ExponentB",
        "renderer": "Float",
        "label": "ExponentB",
        "requestedWidth": 100
      },
      {
        "id": "Range",
        "jsonKey": "Range",
        "renderer": "Float",
        "label": "Range",
        "requestedWidth": 100
      },
      {
        "id": "Transition",
        "jsonKey": "Transition",
        "renderer": "Float",
        "label": "Transition",
        "requestedWidth": 100
      },
      {
        "id": "TransitionSmooth",
        "jsonKey": "TransitionSmooth",
        "renderer": "Float",
        "label": "TransitionSmooth",
        "requestedWidth": 100
      }
    ],
    "leftPins": [
      {
        "id": "Input",
        "label": "",
        "type": "Curve.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "DistanceToBiomeEdge.Density": {
    "nodeKind": "DistanceToBiomeEdge.Density",
    "title": "DistanceToBiomeEdge Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "DistanceToGraphEdge.Density": {
    "nodeKind": "DistanceToGraphEdge.Density",
    "title": "[DEV] DistanceToGraphEdge Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "EdgeAction.GraphPass": {
    "nodeKind": "EdgeAction.GraphPass",
    "title": "[DEV] EdgeAction GraphPass",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "StatsLabel",
        "jsonKey": "StatsLabel",
        "renderer": "SmallString",
        "label": "StatsLabel",
        "requestedWidth": 250
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "GraphPass.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "EdgeAction",
        "label": "EdgeAction",
        "type": "EdgeAction.Connection",
        "multiple": false
      }
    ]
  },
  "Ellipsoid.Density": {
    "nodeKind": "Ellipsoid.Density",
    "title": "Ellipsoid Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "Spin",
        "jsonKey": "Spin",
        "renderer": "Float",
        "label": "Spin"
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Curve",
        "label": "Curve",
        "type": "Curve.Connection",
        "multiple": false
      },
      {
        "id": "Scale",
        "label": "Scale",
        "type": "Decimal.Vector3d.Connection",
        "multiple": false
      },
      {
        "id": "NewYAxis",
        "label": "NewYAxis",
        "type": "Decimal.Vector3d.Connection",
        "multiple": false
      }
    ]
  },
  "Empty.EdgeAction": {
    "nodeKind": "Empty.EdgeAction",
    "title": "[DEV] Empty EdgeAction",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "EdgeAction.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "Empty.NodeAction": {
    "nodeKind": "Empty.NodeAction",
    "title": "[DEV] Empty NodeAction",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "NodeAction.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "Entry.Weighted.ContentSupplier": {
    "nodeKind": "Entry.Weighted.ContentSupplier",
    "title": "[DEV] Entry | Weighted ContentSupplier",
    "fields": [
      {
        "id": "Weight",
        "jsonKey": "Weight",
        "renderer": "Float",
        "label": "Weight",
        "requestedWidth": 150
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Entry.Weighted.ContentSupplier.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "ContentSupplier",
        "label": "ContentSupplier",
        "type": "ContentSupplier.Connection",
        "multiple": false
      }
    ]
  },
  "Entry.Weighted.MaterialProvider": {
    "nodeKind": "Entry.Weighted.MaterialProvider",
    "title": "Weight",
    "fields": [
      {
        "id": "Weight",
        "jsonKey": "Weight",
        "renderer": "Float",
        "label": "Weight",
        "requestedWidth": 50
      }
    ],
    "leftPins": [
      {
        "id": "OutputPin",
        "label": "",
        "type": "Entry.Weighted.MaterialProvider.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "MaterialPin",
        "label": "Material",
        "type": "MaterialProvider.Connection",
        "multiple": false
      }
    ]
  },
  "Entry.Weighted.NodeAction": {
    "nodeKind": "Entry.Weighted.NodeAction",
    "title": "[DEV] Entry | Weighted NodeAction",
    "fields": [
      {
        "id": "Weight",
        "jsonKey": "Weight",
        "renderer": "Float",
        "label": "Weight",
        "requestedWidth": 150
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Entry.Weighted.NodeAction.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "NodeAction",
        "label": "NodeAction",
        "type": "NodeAction.Connection",
        "multiple": false
      }
    ]
  },
  "Entry.Weighted.Prop": {
    "nodeKind": "Entry.Weighted.Prop",
    "title": "Entry - Weighted Prop",
    "fields": [
      {
        "id": "Weight",
        "jsonKey": "Weight",
        "renderer": "Float",
        "label": "Weight"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Entry.Weighted.Prop.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Prop",
        "label": "Prop",
        "type": "Prop.Connection",
        "multiple": false
      }
    ]
  },
  "Entry.WeightedThickness.Layer.SpaceAndDepth.MaterialProvider": {
    "nodeKind": "Entry.WeightedThickness.Layer.SpaceAndDepth.MaterialProvider",
    "title": "WeightedThickness SADMP",
    "fields": [
      {
        "id": "Weight",
        "jsonKey": "Weight",
        "renderer": "Float",
        "label": "Weight",
        "requestedWidth": 50
      },
      {
        "id": "Thickness",
        "jsonKey": "Thickness",
        "renderer": "Int",
        "label": "Thickness",
        "requestedWidth": 50
      }
    ],
    "leftPins": [
      {
        "id": "OutputPin",
        "label": "",
        "type": "Thickness.Layer.SpaceAndDepth.MaterialProvider.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "Equal.Density": {
    "nodeKind": "Equal.Density",
    "title": "Equal Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "Epsilon",
        "jsonKey": "Epsilon",
        "renderer": "Float",
        "label": "Epsilon",
        "requestedWidth": 100
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "DensityInputs",
        "label": "Inputs",
        "type": "Density.Connection",
        "multiple": true
      }
    ]
  },
  "Equals.Condition.SpaceAndDepth.MaterialProvider": {
    "nodeKind": "Equals.Condition.SpaceAndDepth.MaterialProvider",
    "title": "Equals Condition SADMP",
    "fields": [
      {
        "id": "ContextToCheck",
        "jsonKey": "ContextToCheck",
        "renderer": "SmallString",
        "label": "ContextToCheck",
        "requestedWidth": 200
      },
      {
        "id": "Value",
        "jsonKey": "Value",
        "renderer": "Int",
        "label": "Value",
        "requestedWidth": 50
      }
    ],
    "leftPins": [
      {
        "id": "OutputPin",
        "label": "",
        "type": "Condition.SpaceAndDepth.MaterialProvider.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "Exported.Density": {
    "nodeKind": "Exported.Density",
    "title": "[EXPERIMENTAL] Exported Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 350
      },
      {
        "id": "SingleInstance",
        "jsonKey": "SingleInstance",
        "renderer": "Checkbox",
        "label": "[EXPERIMENTAL] SingleInstance"
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "DensityInputs",
        "label": "",
        "type": "Density.Connection",
        "multiple": true
      }
    ]
  },
  "Exported.VectorProvider": {
    "nodeKind": "Exported.VectorProvider",
    "title": "Exported VectorProvider",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "SingleInstance",
        "jsonKey": "SingleInstance",
        "renderer": "Checkbox",
        "label": "SingleInstance"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "VectorProvider.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "VectorProvider",
        "label": "VectorProvider",
        "type": "VectorProvider.Connection",
        "multiple": false
      }
    ]
  },
  "FastGradientWarp.Density": {
    "nodeKind": "FastGradientWarp.Density",
    "title": "FastGradientWarp Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "WarpLacunarity",
        "jsonKey": "WarpLacunarity",
        "renderer": "Float",
        "label": "WarpLacunarity",
        "requestedWidth": 70
      },
      {
        "id": "WarpPersistence",
        "jsonKey": "WarpPersistence",
        "renderer": "Float",
        "label": "WarpPersistence",
        "requestedWidth": 70
      },
      {
        "id": "WarpScale",
        "jsonKey": "WarpScale",
        "renderer": "Float",
        "label": "WarpScale",
        "requestedWidth": 70
      },
      {
        "id": "WarpOctaves",
        "jsonKey": "WarpOctaves",
        "renderer": "Int",
        "label": "WarpOctaves",
        "requestedWidth": 70
      },
      {
        "id": "WarpFactor",
        "jsonKey": "WarpFactor",
        "renderer": "Float",
        "label": "WarpFactor",
        "requestedWidth": 70
      },
      {
        "id": "Seed",
        "jsonKey": "Seed",
        "renderer": "SmallString",
        "label": "Seed",
        "requestedWidth": 350
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "DensityInputs",
        "label": "Inputs",
        "type": "Density.Connection",
        "multiple": true
      }
    ]
  },
  "FieldFunction.Assignments": {
    "nodeKind": "FieldFunction.Assignments",
    "title": "FieldFunction Assignments",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Assignments.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "FieldFunction.Pin",
        "label": "FieldFunction",
        "type": "Density.Connection",
        "multiple": false
      },
      {
        "id": "Delimiters.Pin",
        "label": "Delimiters",
        "type": "Delimiter.FieldFunction.Assignments.Connection",
        "multiple": true
      }
    ]
  },
  "FieldFunction.MaterialProvider": {
    "nodeKind": "FieldFunction.MaterialProvider",
    "title": "FieldFunction MaterialProvider",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "OutputPin",
        "label": "",
        "type": "MaterialProvider.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "FieldFunctionPin",
        "label": "FieldFunction",
        "type": "Density.Connection",
        "multiple": false
      },
      {
        "id": "DelimitersPin",
        "label": "Delimiters",
        "type": "Delimiter.FieldFunction.MaterialProvider.Connection",
        "multiple": true
      }
    ]
  },
  "FieldFunction.Pattern": {
    "nodeKind": "FieldFunction.Pattern",
    "title": "FieldFunction Pattern",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Pattern.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "FieldFunction",
        "label": "FieldFunction",
        "type": "Density.Connection",
        "multiple": false
      },
      {
        "id": "Delimiters",
        "label": "Delimiters",
        "type": "Delimiter.FieldFunction.Pattern.Connection",
        "multiple": true
      }
    ]
  },
  "FieldFunction.Positions": {
    "nodeKind": "FieldFunction.Positions",
    "title": "FieldFunction Positions",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Positions.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Positions.Connection",
        "label": "Positions",
        "type": "Positions.Connection",
        "multiple": false
      },
      {
        "id": "Density.Connection",
        "label": "Density",
        "type": "Density.Connection",
        "multiple": false
      },
      {
        "id": "DelimiterConnections",
        "label": "Delimiters",
        "type": "Delimiter.Positions.Connection",
        "multiple": true
      }
    ]
  },
  "Floor.Curve": {
    "nodeKind": "Floor.Curve",
    "title": "Floor Curve",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Floor_",
        "jsonKey": "Floor_",
        "renderer": "Float",
        "label": "Floor",
        "requestedWidth": 100
      }
    ],
    "leftPins": [
      {
        "id": "Input",
        "label": "",
        "type": "Curve.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Curve",
        "label": "Curve",
        "type": "Curve.Connection",
        "multiple": false
      }
    ]
  },
  "Floor.Density": {
    "nodeKind": "Floor.Density",
    "title": "[DEPRECATED] Floor Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "Limit",
        "jsonKey": "Limit",
        "renderer": "Float",
        "label": "Limit",
        "requestedWidth": 100
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "DensityInputs",
        "label": "Inputs",
        "type": "Density.Connection",
        "multiple": true
      }
    ]
  },
  "Floor.Pattern": {
    "nodeKind": "Floor.Pattern",
    "title": "Floor Pattern",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Pattern.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Origin",
        "label": "Origin",
        "type": "Pattern.Connection",
        "multiple": false
      },
      {
        "id": "Floor",
        "label": "Floor",
        "type": "Pattern.Connection",
        "multiple": false
      }
    ]
  },
  "Framework.Positions": {
    "nodeKind": "Framework.Positions",
    "title": "Framework Positions",
    "fields": [
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "Name",
        "jsonKey": "Name",
        "renderer": "SmallString",
        "label": "Name",
        "requestedWidth": 350
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Positions.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "FunctionForY": {
    "nodeKind": "FunctionForY",
    "title": "FunctionForY",
    "fields": [],
    "leftPins": [
      {
        "id": "Connection",
        "label": "",
        "type": "FunctionForY.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Points",
        "label": "Points",
        "type": "Point.FunctionForY.Connection",
        "multiple": true
      }
    ]
  },
  "Gradient.Density": {
    "nodeKind": "Gradient.Density",
    "title": "[DEPRECATED] Gradient Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "SampleRange",
        "jsonKey": "SampleRange",
        "renderer": "Float",
        "label": "SampleRange",
        "requestedWidth": 70
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "DensityInputs",
        "label": "Inputs",
        "type": "Density.Connection",
        "multiple": true
      },
      {
        "id": "Axis",
        "label": "Axis",
        "type": "Decimal.Vector3d.Connection",
        "multiple": false
      }
    ]
  },
  "GradientWarp.Density": {
    "nodeKind": "GradientWarp.Density",
    "title": "GradientWarp Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "SampleRange",
        "jsonKey": "SampleRange",
        "renderer": "Float",
        "label": "SampleRange",
        "requestedWidth": 70
      },
      {
        "id": "WarpFactor",
        "jsonKey": "WarpFactor",
        "renderer": "Float",
        "label": "WarpFactor",
        "requestedWidth": 70
      },
      {
        "id": "2D",
        "jsonKey": "2D",
        "renderer": "Checkbox",
        "label": "2D Output"
      },
      {
        "id": "YFor2D",
        "jsonKey": "YFor2D",
        "renderer": "Float",
        "label": "Y for 2D"
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "DensityInputs",
        "label": "Inputs",
        "type": "Density.Connection",
        "multiple": true
      }
    ]
  },
  "Graph.Density": {
    "nodeKind": "Graph.Density",
    "title": "[DEV] Graph Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "ContentLayer",
        "jsonKey": "ContentLayer",
        "renderer": "SmallString",
        "label": "ContentLayer",
        "requestedWidth": 350
      },
      {
        "id": "BackgroundValue",
        "jsonKey": "BackgroundValue",
        "renderer": "Float",
        "label": "BackgroundValue",
        "requestedWidth": 100
      },
      {
        "id": "TransitionSlope",
        "jsonKey": "TransitionSlope",
        "renderer": "Float",
        "label": "TransitionSlope",
        "requestedWidth": 100
      },
      {
        "id": "TransitionOffset",
        "jsonKey": "TransitionOffset",
        "renderer": "Float",
        "label": "TransitionOffset",
        "requestedWidth": 100
      },
      {
        "id": "TransitionSmooth",
        "jsonKey": "TransitionSmooth",
        "renderer": "Float",
        "label": "TransitionSmooth",
        "requestedWidth": 100
      },
      {
        "id": "QueryBufferCapacity",
        "jsonKey": "QueryBufferCapacity",
        "renderer": "Int",
        "label": "QueryBufferCapacity",
        "requestedWidth": 100
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "GraphGenerator",
        "label": "GraphGenerator",
        "type": "GraphGenerator.Connection",
        "multiple": false
      }
    ]
  },
  "Graph.MaterialProvider": {
    "nodeKind": "Graph.MaterialProvider",
    "title": "[DEV] Graph MaterialProvider",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "ContentLayer",
        "jsonKey": "ContentLayer",
        "renderer": "SmallString",
        "label": "ContentLayer",
        "requestedWidth": 350
      },
      {
        "id": "QueryBufferCapacity",
        "jsonKey": "QueryBufferCapacity",
        "renderer": "Int",
        "label": "QueryBufferCapacity",
        "requestedWidth": 100
      }
    ],
    "leftPins": [
      {
        "id": "OutputPin",
        "label": "",
        "type": "MaterialProvider.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "GraphGenerator",
        "label": "GraphGenerator",
        "type": "GraphGenerator.Connection",
        "multiple": false
      }
    ]
  },
  "Graph.Positions": {
    "nodeKind": "Graph.Positions",
    "title": "[DEV] Graph Positions",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "ContentLayer",
        "jsonKey": "ContentLayer",
        "renderer": "SmallString",
        "label": "ContentLayer",
        "requestedWidth": 350
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Positions.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "GraphGenerator",
        "label": "GraphGenerator",
        "type": "GraphGenerator.Connection",
        "multiple": false
      }
    ]
  },
  "Graph.PropDistribution": {
    "nodeKind": "Graph.PropDistribution",
    "title": "[DEV] Graph PropDistribution",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "ContentLayer",
        "jsonKey": "ContentLayer",
        "renderer": "SmallString",
        "label": "ContentLayer",
        "requestedWidth": 350
      }
    ],
    "leftPins": [
      {
        "id": "OutputPin",
        "label": "",
        "type": "PropDistribution.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "GraphGenerator",
        "label": "GraphGenerator",
        "type": "GraphGenerator.Connection",
        "multiple": false
      }
    ]
  },
  "GraphGenerator": {
    "nodeKind": "GraphGenerator",
    "title": "[DEV] GraphGenerator",
    "fields": [
      {
        "id": "ImportName",
        "jsonKey": "ImportName",
        "renderer": "SmallString",
        "label": "ImportName",
        "requestedWidth": 350
      },
      {
        "id": "ExportName",
        "jsonKey": "ExportName",
        "renderer": "SmallString",
        "label": "ExportName",
        "requestedWidth": 350
      },
      {
        "id": "IsSingleInstance",
        "jsonKey": "IsSingleInstance",
        "renderer": "Checkbox",
        "label": "IsSingleInstance"
      },
      {
        "id": "CacheCapacity",
        "jsonKey": "CacheCapacity",
        "renderer": "Int",
        "label": "CacheCapacity",
        "requestedWidth": 100
      },
      {
        "id": "PrintStats",
        "jsonKey": "PrintStats",
        "renderer": "Checkbox",
        "label": "PrintStats"
      },
      {
        "id": "StatsPrintInterval",
        "jsonKey": "StatsPrintInterval",
        "renderer": "Int",
        "label": "StatsPrintInterval",
        "requestedWidth": 100
      },
      {
        "id": "StatsLabel",
        "jsonKey": "StatsLabel",
        "renderer": "SmallString",
        "label": "StatsLabel",
        "requestedWidth": 250
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "GraphGenerator.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "GraphPasses",
        "label": "GraphPasses",
        "type": "GraphPass.Connection",
        "multiple": true
      },
      {
        "id": "CacheCellSize",
        "label": "CacheCellSize",
        "type": "Decimal.Vector3d.Connection",
        "multiple": false
      }
    ]
  },
  "GreaterOrEqual.Density": {
    "nodeKind": "GreaterOrEqual.Density",
    "title": "GreaterOrEqual Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "DensityInputs",
        "label": "Inputs",
        "type": "Density.Connection",
        "multiple": true
      }
    ]
  },
  "GreaterThan.Condition.SpaceAndDepth.MaterialProvider": {
    "nodeKind": "GreaterThan.Condition.SpaceAndDepth.MaterialProvider",
    "title": "GreaterThan Condition SADMP",
    "fields": [
      {
        "id": "ContextToCheck",
        "jsonKey": "ContextToCheck",
        "renderer": "SmallString",
        "label": "ContextToCheck",
        "requestedWidth": 200
      },
      {
        "id": "Threshold",
        "jsonKey": "Threshold",
        "renderer": "Int",
        "label": "Threshold",
        "requestedWidth": 50
      }
    ],
    "leftPins": [
      {
        "id": "OutputPin",
        "label": "",
        "type": "Condition.SpaceAndDepth.MaterialProvider.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "GreaterThan.Density": {
    "nodeKind": "GreaterThan.Density",
    "title": "GreaterThan Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "DensityInputs",
        "label": "Inputs",
        "type": "Density.Connection",
        "multiple": true
      }
    ]
  },
  "Imported.Assignments": {
    "nodeKind": "Imported.Assignments",
    "title": "Imported Assignments",
    "fields": [
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "Name",
        "jsonKey": "Name",
        "renderer": "SmallString",
        "label": "Name",
        "requestedWidth": 350
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Assignments.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "Imported.ContentPredicate": {
    "nodeKind": "Imported.ContentPredicate",
    "title": "[DEV] Imported ContentPredicate",
    "fields": [
      {
        "id": "Name",
        "jsonKey": "Name",
        "renderer": "SmallString",
        "label": "Name",
        "requestedWidth": 350
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "ContentPredicate.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "Imported.ContentSupplier": {
    "nodeKind": "Imported.ContentSupplier",
    "title": "[DEV] Imported ContentSupplier",
    "fields": [
      {
        "id": "Name",
        "jsonKey": "Name",
        "renderer": "SmallString",
        "label": "Name",
        "requestedWidth": 350
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "ContentSupplier.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "Imported.Curve": {
    "nodeKind": "Imported.Curve",
    "title": "Imported Curve",
    "fields": [
      {
        "id": "Name",
        "jsonKey": "Name",
        "renderer": "SmallString",
        "label": "Name",
        "requestedWidth": 350
      }
    ],
    "leftPins": [
      {
        "id": "Input",
        "label": "",
        "type": "Curve.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "Imported.Density": {
    "nodeKind": "Imported.Density",
    "title": "Imported Density",
    "fields": [
      {
        "id": "Name",
        "jsonKey": "Name",
        "renderer": "SmallString",
        "label": "Name",
        "requestedWidth": 350
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "Imported.Directionality": {
    "nodeKind": "Imported.Directionality",
    "title": "Imported Directionality",
    "fields": [
      {
        "id": "Name",
        "jsonKey": "Name",
        "renderer": "SmallString",
        "label": "Name",
        "requestedWidth": 350
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Directionality.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "Imported.EdgeAction": {
    "nodeKind": "Imported.EdgeAction",
    "title": "[DEV] Imported EdgeAction",
    "fields": [
      {
        "id": "Name",
        "jsonKey": "Name",
        "renderer": "SmallString",
        "label": "Name",
        "requestedWidth": 350
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "EdgeAction.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "Imported.EdgeSelector": {
    "nodeKind": "Imported.EdgeSelector",
    "title": "[DEV] Imported EdgeSelector",
    "fields": [
      {
        "id": "Name",
        "jsonKey": "Name",
        "renderer": "SmallString",
        "label": "Name",
        "requestedWidth": 350
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "EdgeSelector.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "Imported.GraphPass": {
    "nodeKind": "Imported.GraphPass",
    "title": "[DEV] Imported GraphPass",
    "fields": [
      {
        "id": "Name",
        "jsonKey": "Name",
        "renderer": "SmallString",
        "label": "Name",
        "requestedWidth": 350
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "GraphPass.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "Imported.MaterialProvider": {
    "nodeKind": "Imported.MaterialProvider",
    "title": "Imported MaterialProvider",
    "fields": [
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "Name",
        "jsonKey": "Name",
        "renderer": "SmallString",
        "label": "Name",
        "requestedWidth": 350
      }
    ],
    "leftPins": [
      {
        "id": "OutputPin",
        "label": "",
        "type": "MaterialProvider.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "Imported.NodeAction": {
    "nodeKind": "Imported.NodeAction",
    "title": "[DEV] Imported NodeAction",
    "fields": [
      {
        "id": "Name",
        "jsonKey": "Name",
        "renderer": "SmallString",
        "label": "Name",
        "requestedWidth": 350
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "NodeAction.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "Imported.NodeSelector": {
    "nodeKind": "Imported.NodeSelector",
    "title": "[DEV] Imported NodeSelector",
    "fields": [
      {
        "id": "Name",
        "jsonKey": "Name",
        "renderer": "SmallString",
        "label": "Name",
        "requestedWidth": 350
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "NodeSelector.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "Imported.Pattern": {
    "nodeKind": "Imported.Pattern",
    "title": "Imported Pattern",
    "fields": [
      {
        "id": "Name",
        "jsonKey": "Name",
        "renderer": "SmallString",
        "label": "Name",
        "requestedWidth": 350
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Pattern.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "Imported.Positions": {
    "nodeKind": "Imported.Positions",
    "title": "Imported Positions",
    "fields": [
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "Name",
        "jsonKey": "Name",
        "renderer": "SmallString",
        "label": "Name",
        "requestedWidth": 350
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Positions.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "Imported.Prop": {
    "nodeKind": "Imported.Prop",
    "title": "Imported Prop",
    "fields": [
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "Name",
        "jsonKey": "Name",
        "renderer": "SmallString",
        "label": "Name",
        "requestedWidth": 350
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Prop.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "Imported.PropDistribution": {
    "nodeKind": "Imported.PropDistribution",
    "title": "Imported PropDistribution",
    "fields": [
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "Name",
        "jsonKey": "Name",
        "renderer": "SmallString",
        "label": "Name",
        "requestedWidth": 350
      }
    ],
    "leftPins": [
      {
        "id": "OutputPin",
        "label": "",
        "type": "PropDistribution.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "Imported.Scanner": {
    "nodeKind": "Imported.Scanner",
    "title": "Imported Scanner",
    "fields": [
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "Name",
        "jsonKey": "Name",
        "renderer": "SmallString",
        "label": "Name",
        "requestedWidth": 350
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Scanner.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "Imported.VectorProvider": {
    "nodeKind": "Imported.VectorProvider",
    "title": "Imported VectorProvider",
    "fields": [
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "Name",
        "jsonKey": "Name",
        "renderer": "SmallString",
        "label": "Name",
        "requestedWidth": 350
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "VectorProvider.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "Integer.Bounds3d": {
    "nodeKind": "Integer.Bounds3d",
    "title": "Integer Bounds 3D",
    "fields": [],
    "leftPins": [
      {
        "id": "Input",
        "label": "",
        "type": "Integer.Bounds3d.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "PointA",
        "label": "PointA",
        "type": "Integer.Vector3d.Connection",
        "multiple": false
      },
      {
        "id": "PointB",
        "label": "PointB",
        "type": "Integer.Vector3d.Connection",
        "multiple": false
      }
    ]
  },
  "Integer.Range": {
    "nodeKind": "Integer.Range",
    "title": "Integer Range",
    "fields": [
      {
        "id": "MinInclusive",
        "jsonKey": "MinInclusive",
        "renderer": "Int",
        "label": "MinInclusive",
        "requestedWidth": 50
      },
      {
        "id": "MaxExclusive",
        "jsonKey": "MaxExclusive",
        "renderer": "Int",
        "label": "MaxExclusive",
        "requestedWidth": 50
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Integer.Range.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "Integer.Vector3d": {
    "nodeKind": "Integer.Vector3d",
    "title": "Integer 3D Vector",
    "fields": [
      {
        "id": "X",
        "jsonKey": "X",
        "renderer": "Int",
        "label": "X",
        "requestedWidth": 100
      },
      {
        "id": "Y",
        "jsonKey": "Y",
        "renderer": "Int",
        "label": "Y",
        "requestedWidth": 100
      },
      {
        "id": "Z",
        "jsonKey": "Z",
        "renderer": "Int",
        "label": "Z",
        "requestedWidth": 100
      }
    ],
    "leftPins": [
      {
        "id": "Integer.Vector3d.Connection",
        "label": "",
        "type": "Integer.Vector3d.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "Inverter.Curve": {
    "nodeKind": "Inverter.Curve",
    "title": "Inverter Curve",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      }
    ],
    "leftPins": [
      {
        "id": "Input",
        "label": "",
        "type": "Curve.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Curve",
        "label": "Curve",
        "type": "Curve.Connection",
        "multiple": false
      }
    ]
  },
  "Inverter.Density": {
    "nodeKind": "Inverter.Density",
    "title": "Inverter Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "DensityInputs",
        "label": "Inputs",
        "type": "Density.Connection",
        "multiple": true
      }
    ]
  },
  "Jitter2d.NodeAction": {
    "nodeKind": "Jitter2d.NodeAction",
    "title": "[DEV] Jitter2d NodeAction",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "Magnitude",
        "jsonKey": "Magnitude",
        "renderer": "Float",
        "label": "Magnitude"
      },
      {
        "id": "Seed",
        "jsonKey": "Seed",
        "renderer": "SmallString",
        "label": "Seed",
        "requestedWidth": 350
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "NodeAction.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "Jitter2d.Positions": {
    "nodeKind": "Jitter2d.Positions",
    "title": "Jitter2d Positions",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "Magnitude",
        "jsonKey": "Magnitude",
        "renderer": "Float",
        "label": "Magnitude",
        "requestedWidth": 50
      },
      {
        "id": "Seed",
        "jsonKey": "Seed",
        "renderer": "SmallString",
        "label": "Seed",
        "requestedWidth": 350
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Positions.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Positions.Connection",
        "label": "Positions",
        "type": "Positions.Connection",
        "multiple": false
      }
    ]
  },
  "Jitter3d.NodeAction": {
    "nodeKind": "Jitter3d.NodeAction",
    "title": "[DEV] Jitter3d NodeAction",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "Magnitude",
        "jsonKey": "Magnitude",
        "renderer": "Float",
        "label": "Magnitude"
      },
      {
        "id": "Seed",
        "jsonKey": "Seed",
        "renderer": "SmallString",
        "label": "Seed",
        "requestedWidth": 350
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "NodeAction.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "Jitter3d.Positions": {
    "nodeKind": "Jitter3d.Positions",
    "title": "Jitter3d Positions",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "Magnitude",
        "jsonKey": "Magnitude",
        "renderer": "Float",
        "label": "Magnitude",
        "requestedWidth": 50
      },
      {
        "id": "Seed",
        "jsonKey": "Seed",
        "renderer": "SmallString",
        "label": "Seed",
        "requestedWidth": 350
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Positions.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Positions.Connection",
        "label": "Positions",
        "type": "Positions.Connection",
        "multiple": false
      }
    ]
  },
  "Key.MultiMix.Density": {
    "nodeKind": "Key.MultiMix.Density",
    "title": "Key MultiMix Density",
    "fields": [
      {
        "id": "Value",
        "jsonKey": "Value",
        "renderer": "Float",
        "label": "Value",
        "requestedWidth": 100
      },
      {
        "id": "DensityIndex",
        "jsonKey": "DensityIndex",
        "renderer": "Int",
        "label": "DensityIndex",
        "requestedWidth": 40
      }
    ],
    "leftPins": [
      {
        "id": "Key.MultiMix.Output",
        "label": "",
        "type": "Key.MultiMix.Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "Length.EdgeSelector": {
    "nodeKind": "Length.EdgeSelector",
    "title": "[DEV] Length EdgeSelector",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "EdgeSelector.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Delimiters",
        "label": "Delimiters",
        "type": "Decimal.Range.Connection",
        "multiple": true
      }
    ]
  },
  "LessOrEqual.Density": {
    "nodeKind": "LessOrEqual.Density",
    "title": "LessOrEqual Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "DensityInputs",
        "label": "Inputs",
        "type": "Density.Connection",
        "multiple": true
      }
    ]
  },
  "LessThan.Density": {
    "nodeKind": "LessThan.Density",
    "title": "LessThan Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "DensityInputs",
        "label": "Inputs",
        "type": "Density.Connection",
        "multiple": true
      }
    ]
  },
  "Linear.Scanner": {
    "nodeKind": "Linear.Scanner",
    "title": "Linear Scanner",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "Axis",
        "jsonKey": "Axis",
        "renderer": "Enum",
        "label": "Axis"
      },
      {
        "id": "AscendingOrder",
        "jsonKey": "AscendingOrder",
        "renderer": "Checkbox",
        "label": "AscendingOrder"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Scanner.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Scanner",
        "label": "Scanner",
        "type": "Scanner.Connection",
        "multiple": false
      },
      {
        "id": "Range",
        "label": "Range",
        "type": "Integer.Range.Connection",
        "multiple": false
      }
    ]
  },
  "List.Positions": {
    "nodeKind": "List.Positions",
    "title": "List Positions",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Positions.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "PointConnections",
        "label": "Positions",
        "type": "Decimal.Vector3d.Connection",
        "multiple": true
      }
    ]
  },
  "Locator.Prop": {
    "nodeKind": "Locator.Prop",
    "title": "Locator Prop",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "PlacementCap",
        "jsonKey": "PlacementCap",
        "renderer": "Int",
        "label": "PlacementCap"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Prop.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Prop",
        "label": "Prop",
        "type": "Prop.Connection",
        "multiple": false
      },
      {
        "id": "Pattern",
        "label": "Pattern",
        "type": "Pattern.Connection",
        "multiple": false
      },
      {
        "id": "Scanner",
        "label": "Scanner",
        "type": "Scanner.Connection",
        "multiple": false
      }
    ]
  },
  "Manual.Curve": {
    "nodeKind": "Manual.Curve",
    "title": "Manual Curve",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      }
    ],
    "leftPins": [
      {
        "id": "Input",
        "label": "",
        "type": "Curve.Connection",
        "multiple": false
      },
      {
        "id": "Restricted.Input",
        "label": "",
        "type": "Manual.Curve.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Points",
        "label": "Points",
        "type": "CurvePoint.Curve.Connection",
        "multiple": true
      }
    ]
  },
  "Manual.GraphPass": {
    "nodeKind": "Manual.GraphPass",
    "title": "[DEV] Manual GraphPass",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "StatsLabel",
        "jsonKey": "StatsLabel",
        "renderer": "SmallString",
        "label": "StatsLabel",
        "requestedWidth": 250
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "GraphPass.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Nodes",
        "label": "Nodes",
        "type": "Node.Manual.GraphPass.Connection",
        "multiple": true
      }
    ]
  },
  "Manual.Prop": {
    "nodeKind": "Manual.Prop",
    "title": "Manual Prop",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Prop.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Blocks",
        "label": "Blocks",
        "type": "Block.Manual.Prop.Connection",
        "multiple": true
      }
    ]
  },
  "Mask.Prop": {
    "nodeKind": "Mask.Prop",
    "title": "Mask Prop",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Prop.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Prop",
        "label": "Prop",
        "type": "Prop.Connection",
        "multiple": false
      },
      {
        "id": "Mask",
        "label": "Mask",
        "type": "BlockMask.Connection",
        "multiple": false
      }
    ]
  },
  "Material": {
    "nodeKind": "Material",
    "title": "Material",
    "fields": [
      {
        "id": "Solid",
        "jsonKey": "Solid",
        "renderer": "SmallString",
        "label": "Solid",
        "requestedWidth": 350
      },
      {
        "id": "Fluid",
        "jsonKey": "Fluid",
        "renderer": "SmallString",
        "label": "Fluid",
        "requestedWidth": 350
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Material.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "SolidRotation",
        "label": "SolidRotation",
        "type": "OrthogonalRotation.Rotation.Connection",
        "multiple": false
      }
    ]
  },
  "Material.NodeContent": {
    "nodeKind": "Material.NodeContent",
    "title": "[DEV] Material NodeContent",
    "fields": [
      {
        "id": "ContentLayer",
        "jsonKey": "ContentLayer",
        "renderer": "SmallString",
        "label": "ContentLayer",
        "requestedWidth": 350
      },
      {
        "id": "Range",
        "jsonKey": "Range",
        "renderer": "Float",
        "label": "Range"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Material.NodeContent.Graph.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "MaterialProvider",
        "label": "MaterialProvider",
        "type": "MaterialProvider.Connection",
        "multiple": false
      }
    ]
  },
  "Max.Curve": {
    "nodeKind": "Max.Curve",
    "title": "Max Curve",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      }
    ],
    "leftPins": [
      {
        "id": "Input",
        "label": "",
        "type": "Curve.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Curves",
        "label": "Curves",
        "type": "Curve.Connection",
        "multiple": true
      }
    ]
  },
  "Max.Density": {
    "nodeKind": "Max.Density",
    "title": "Max Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "DensityInputs",
        "label": "Inputs",
        "type": "Density.Connection",
        "multiple": true
      }
    ]
  },
  "Mesh.PointGenerator": {
    "nodeKind": "Mesh.PointGenerator",
    "title": "[DEPRECATED] Mesh Point Generator",
    "fields": [
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "Jitter",
        "jsonKey": "Jitter",
        "renderer": "Float",
        "label": "Jitter",
        "requestedWidth": 100
      },
      {
        "id": "ScaleX",
        "jsonKey": "ScaleX",
        "renderer": "Float",
        "label": "ScaleX",
        "requestedWidth": 100
      },
      {
        "id": "ScaleY",
        "jsonKey": "ScaleY",
        "renderer": "Float",
        "label": "ScaleY",
        "requestedWidth": 100
      },
      {
        "id": "ScaleZ",
        "jsonKey": "ScaleZ",
        "renderer": "Float",
        "label": "ScaleZ",
        "requestedWidth": 100
      },
      {
        "id": "Seed",
        "jsonKey": "Seed",
        "renderer": "SmallString",
        "label": "Seed",
        "requestedWidth": 350
      }
    ],
    "leftPins": [
      {
        "id": "Connection",
        "label": "",
        "type": "PointGenerator.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "Mesh2D.Positions": {
    "nodeKind": "Mesh2D.Positions",
    "title": "[DEPRECATED] Mesh2D Positions",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "PointsY",
        "jsonKey": "PointsY",
        "renderer": "Float",
        "label": "PointsY",
        "requestedWidth": 100
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Positions.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "PointGenerator.Connection",
        "label": "PointGenerator",
        "type": "PointGenerator.Connection",
        "multiple": false
      }
    ]
  },
  "Mesh3D.Positions": {
    "nodeKind": "Mesh3D.Positions",
    "title": "[DEPRECATED] Mesh3D Positions",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Positions.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "PointGenerator.Connection",
        "label": "PointGenerator",
        "type": "PointGenerator.Connection",
        "multiple": false
      }
    ]
  },
  "Min.Curve": {
    "nodeKind": "Min.Curve",
    "title": "Min Curve",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      }
    ],
    "leftPins": [
      {
        "id": "Input",
        "label": "",
        "type": "Curve.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Curves",
        "label": "Curves",
        "type": "Curve.Connection",
        "multiple": true
      }
    ]
  },
  "Min.Density": {
    "nodeKind": "Min.Density",
    "title": "Min Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "DensityInputs",
        "label": "Inputs",
        "type": "Density.Connection",
        "multiple": true
      }
    ]
  },
  "Mix.Density": {
    "nodeKind": "Mix.Density",
    "title": "Mix Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "DensityInputs",
        "label": "Inputs",
        "type": "Density.Connection",
        "multiple": true
      }
    ]
  },
  "Mix.TintProvider": {
    "nodeKind": "Mix.TintProvider",
    "title": "Mix TintProvider",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "OutputPin",
        "label": "",
        "type": "TintProvider.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Density",
        "label": "Density",
        "type": "Density.Connection",
        "multiple": false
      },
      {
        "id": "TintA",
        "label": "TintA",
        "type": "TintProvider.Connection",
        "multiple": false
      },
      {
        "id": "TintB",
        "label": "TintB",
        "type": "TintProvider.Connection",
        "multiple": false
      }
    ]
  },
  "Move.NodeAction": {
    "nodeKind": "Move.NodeAction",
    "title": "[DEV] Move NodeAction",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "MaxDistance",
        "jsonKey": "MaxDistance",
        "renderer": "Float",
        "label": "MaxDistance"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "NodeAction.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Vector",
        "label": "Vector",
        "type": "VectorProvider.Connection",
        "multiple": false
      }
    ]
  },
  "MultiMix.Density": {
    "nodeKind": "MultiMix.Density",
    "title": "MultiMix Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "DensityInputs",
        "label": "Inputs",
        "type": "Density.Connection",
        "multiple": true
      },
      {
        "id": "Keys",
        "label": "Keys",
        "type": "Key.MultiMix.Density.Connection",
        "multiple": true
      }
    ]
  },
  "Multiplier.Curve": {
    "nodeKind": "Multiplier.Curve",
    "title": "Multiplier Curve",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      }
    ],
    "leftPins": [
      {
        "id": "Input",
        "label": "",
        "type": "Curve.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Curves",
        "label": "Curves",
        "type": "Curve.Connection",
        "multiple": true
      }
    ]
  },
  "Multiplier.Density": {
    "nodeKind": "Multiplier.Density",
    "title": "Multiplier Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "DensityInputs",
        "label": "Inputs",
        "type": "Density.Connection",
        "multiple": true
      }
    ]
  },
  "Multiplier.VectorProvider": {
    "nodeKind": "Multiplier.VectorProvider",
    "title": "Multiplier VectorProvider",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "VectorProvider.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Vectors",
        "label": "Vectors",
        "type": "VectorProvider.Connection",
        "multiple": true
      }
    ]
  },
  "NeighborEdges.NodeSelector": {
    "nodeKind": "NeighborEdges.NodeSelector",
    "title": "[DEV] NeighborEdges NodeSelector",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "SelectedNeighborsThreshold",
        "jsonKey": "SelectedNeighborsThreshold",
        "renderer": "Int",
        "label": "SelectedNeighborsThreshold"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "NodeSelector.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "EdgeSelector",
        "label": "EdgeSelector",
        "type": "EdgeSelector.Connection",
        "multiple": false
      }
    ]
  },
  "NeighborNodes.NodeSelector": {
    "nodeKind": "NeighborNodes.NodeSelector",
    "title": "[DEV] NeighborNodes NodeSelector",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "SelectedNeighborsThreshold",
        "jsonKey": "SelectedNeighborsThreshold",
        "renderer": "Int",
        "label": "SelectedNeighborsThreshold"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "NodeSelector.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "NodeSelector",
        "label": "NodeSelector",
        "type": "NodeSelector.Connection",
        "multiple": false
      }
    ]
  },
  "Node.Manual.GraphPass": {
    "nodeKind": "Node.Manual.GraphPass",
    "title": "[DEV] Node | Manual GraphPass",
    "fields": [
      {
        "id": "Name",
        "jsonKey": "Name",
        "renderer": "SmallString",
        "label": "Name",
        "requestedWidth": 350
      },
      {
        "id": "Connections",
        "jsonKey": "Connections",
        "renderer": "List",
        "label": "Connections",
        "requestedWidth": 350,
        "itemType": "String"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Node.Manual.GraphPass.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Position",
        "label": "Position",
        "type": "Decimal.Vector3d.Connection",
        "multiple": false
      },
      {
        "id": "NodeContent",
        "label": "Content",
        "type": "NodeContent.Graph.Connection",
        "multiple": false
      }
    ]
  },
  "NodeAction.GraphPass": {
    "nodeKind": "NodeAction.GraphPass",
    "title": "[DEV] NodeAction GraphPass",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "StatsLabel",
        "jsonKey": "StatsLabel",
        "renderer": "SmallString",
        "label": "StatsLabel",
        "requestedWidth": 250
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "GraphPass.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "NodeAction",
        "label": "NodeAction",
        "type": "NodeAction.Connection",
        "multiple": false
      }
    ]
  },
  "NodeContent.Graph": {
    "nodeKind": "NodeContent.Graph",
    "title": "[DEV] NodeContent",
    "fields": [
      {
        "id": "ExportName",
        "jsonKey": "ExportName",
        "renderer": "SmallString",
        "label": "ExportName",
        "requestedWidth": 350
      },
      {
        "id": "ImportName",
        "jsonKey": "ImportName",
        "renderer": "SmallString",
        "label": "ImportName",
        "requestedWidth": 350
      },
      {
        "id": "ContentTags",
        "jsonKey": "ContentTags",
        "renderer": "List",
        "label": "ContentTags",
        "requestedWidth": 350,
        "itemType": "String"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "NodeContent.Graph.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "DensityContent",
        "label": "DensityContent",
        "type": "Density.NodeContent.Graph.Connection",
        "multiple": true
      },
      {
        "id": "MaterialContent",
        "label": "MaterialContent",
        "type": "Material.NodeContent.Graph.Connection",
        "multiple": true
      },
      {
        "id": "PropDistributionContent",
        "label": "PropDistributionContent",
        "type": "PropDistribution.NodeContent.Graph.Connection",
        "multiple": true
      },
      {
        "id": "PositionsContent",
        "label": "PositionsContent",
        "type": "Positions.NodeContent.Graph.Connection",
        "multiple": true
      }
    ]
  },
  "Nodes.EdgeAction": {
    "nodeKind": "Nodes.EdgeAction",
    "title": "[DEV] Nodes EdgeAction",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "EdgeAction.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "NodeAction",
        "label": "NodeAction",
        "type": "NodeAction.Connection",
        "multiple": false
      }
    ]
  },
  "Nodes.EdgeSelector": {
    "nodeKind": "Nodes.EdgeSelector",
    "title": "[DEV] Nodes EdgeSelector",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "Operator",
        "jsonKey": "Operator",
        "renderer": "Enum",
        "label": "Operator"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "EdgeSelector.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "NodeSelector",
        "label": "NodeSelector",
        "type": "NodeSelector.Connection",
        "multiple": false
      }
    ]
  },
  "NoiseThickness.Layer.SpaceAndDepth.MaterialProvider": {
    "nodeKind": "NoiseThickness.Layer.SpaceAndDepth.MaterialProvider",
    "title": "NoiseThickness Layer SADMP",
    "fields": [],
    "leftPins": [
      {
        "id": "OutputPin",
        "label": "",
        "type": "Layer.SpaceAndDepth.MaterialProvider.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "MaterialPin",
        "label": "Material",
        "type": "MaterialProvider.Connection",
        "multiple": false
      },
      {
        "id": "DensityPin",
        "label": "Density",
        "type": "Density.Connection",
        "multiple": false
      }
    ]
  },
  "Nor.Density": {
    "nodeKind": "Nor.Density",
    "title": "Nor Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "DensityInputs",
        "label": "Inputs",
        "type": "Density.Connection",
        "multiple": true
      }
    ]
  },
  "Normalizer.Density": {
    "nodeKind": "Normalizer.Density",
    "title": "Normalizer Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "FromMin",
        "jsonKey": "FromMin",
        "renderer": "Float",
        "label": "FromMin",
        "requestedWidth": 100
      },
      {
        "id": "FromMax",
        "jsonKey": "FromMax",
        "renderer": "Float",
        "label": "FromMax",
        "requestedWidth": 100
      },
      {
        "id": "ToMin",
        "jsonKey": "ToMin",
        "renderer": "Float",
        "label": "ToMin",
        "requestedWidth": 100
      },
      {
        "id": "ToMax",
        "jsonKey": "ToMax",
        "renderer": "Float",
        "label": "ToMax",
        "requestedWidth": 100
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "DensityInputs",
        "label": "Inputs",
        "type": "Density.Connection",
        "multiple": true
      }
    ]
  },
  "Normalizer.VectorProvider": {
    "nodeKind": "Normalizer.VectorProvider",
    "title": "Normalizer VectorProvider",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "VectorProvider.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Vector",
        "label": "Vector",
        "type": "VectorProvider.Connection",
        "multiple": false
      },
      {
        "id": "Magnitude",
        "label": "Magnitude",
        "type": "Density.Connection",
        "multiple": false
      }
    ]
  },
  "Not.Condition.SpaceAndDepth.MaterialProvider": {
    "nodeKind": "Not.Condition.SpaceAndDepth.MaterialProvider",
    "title": "Not Condition SADMP",
    "fields": [],
    "leftPins": [
      {
        "id": "OutputPin",
        "label": "",
        "type": "Condition.SpaceAndDepth.MaterialProvider.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "ConditionsPin",
        "label": "Conditions",
        "type": "Condition.SpaceAndDepth.MaterialProvider.Connection",
        "multiple": false
      }
    ]
  },
  "Not.ContentPredicate": {
    "nodeKind": "Not.ContentPredicate",
    "title": "[DEV] Not ContentPredicate",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "ContentPredicate.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "ContentPredicate",
        "label": "ContentPredicate",
        "type": "ContentPredicate.Connection",
        "multiple": false
      }
    ]
  },
  "Not.Curve": {
    "nodeKind": "Not.Curve",
    "title": "Not Curve",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      }
    ],
    "leftPins": [
      {
        "id": "Input",
        "label": "",
        "type": "Curve.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Curve",
        "label": "Curve",
        "type": "Curve.Connection",
        "multiple": false
      }
    ]
  },
  "Not.Density": {
    "nodeKind": "Not.Density",
    "title": "Not Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "DensityInputs",
        "label": "Inputs",
        "type": "Density.Connection",
        "multiple": true
      }
    ]
  },
  "Not.EdgeSelector": {
    "nodeKind": "Not.EdgeSelector",
    "title": "[DEV] Not EdgeSelector",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "EdgeSelector.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "EdgeSelector",
        "label": "EdgeSelector",
        "type": "EdgeSelector.Connection",
        "multiple": false
      }
    ]
  },
  "Not.NodeSelector": {
    "nodeKind": "Not.NodeSelector",
    "title": "[DEV] Not NodeSelector",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "NodeSelector.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "NodeSelector",
        "label": "NodeSelector",
        "type": "NodeSelector.Connection",
        "multiple": false
      }
    ]
  },
  "Not.Pattern": {
    "nodeKind": "Not.Pattern",
    "title": "Not Pattern",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Pattern.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Pattern",
        "label": "Pattern",
        "type": "Pattern.Connection",
        "multiple": false
      }
    ]
  },
  "Occurrence.Positions": {
    "nodeKind": "Occurrence.Positions",
    "title": "Occurrence Positions",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "Seed",
        "jsonKey": "Seed",
        "renderer": "SmallString",
        "label": "Seed",
        "requestedWidth": 350
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Positions.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Positions.Connection",
        "label": "Positions",
        "type": "Positions.Connection",
        "multiple": false
      },
      {
        "id": "Density.Connection",
        "label": "FieldFunction",
        "type": "Density.Connection",
        "multiple": false
      }
    ]
  },
  "Offset.Density": {
    "nodeKind": "Offset.Density",
    "title": "[DEPRECATED] Offset Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "DensityInputs",
        "label": "Inputs",
        "type": "Density.Connection",
        "multiple": true
      },
      {
        "id": "FunctionForY",
        "label": "FunctionForY",
        "type": "FunctionForY.Connection",
        "multiple": false
      }
    ]
  },
  "Offset.Pattern": {
    "nodeKind": "Offset.Pattern",
    "title": "Offset Pattern",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Pattern.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Pattern",
        "label": "Pattern",
        "type": "Pattern.Connection",
        "multiple": false
      },
      {
        "id": "Offset.Pin",
        "label": "Offset",
        "type": "Integer.Vector3d.Connection",
        "multiple": false
      }
    ]
  },
  "Offset.Positions": {
    "nodeKind": "Offset.Positions",
    "title": "Offset Positions",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "OffsetX",
        "jsonKey": "OffsetX",
        "renderer": "Float",
        "label": "[DEPRECATED] OffsetX",
        "requestedWidth": 100
      },
      {
        "id": "OffsetY",
        "jsonKey": "OffsetY",
        "renderer": "Float",
        "label": "[DEPRECATED] OffsetY",
        "requestedWidth": 100
      },
      {
        "id": "OffsetZ",
        "jsonKey": "OffsetZ",
        "renderer": "Float",
        "label": "[DEPRECATED] OffsetZ",
        "requestedWidth": 100
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Positions.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Offset",
        "label": "Offset",
        "type": "Decimal.Vector3d.Connection",
        "multiple": false
      },
      {
        "id": "Positions.Connection",
        "label": "Positions",
        "type": "Positions.Connection",
        "multiple": false
      }
    ]
  },
  "Offset.Prop": {
    "nodeKind": "Offset.Prop",
    "title": "Offset Prop",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Prop.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Offset",
        "label": "Offset",
        "type": "Decimal.Vector3d.Connection",
        "multiple": false
      },
      {
        "id": "Prop",
        "label": "Prop",
        "type": "Prop.Connection",
        "multiple": false
      }
    ]
  },
  "OffsetConstant.Density": {
    "nodeKind": "OffsetConstant.Density",
    "title": "[DEPRECATED] OffsetConstant Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "Value",
        "jsonKey": "Value",
        "renderer": "Float",
        "label": "Value",
        "requestedWidth": 100
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "DensityInputs",
        "label": "Inputs",
        "type": "Density.Connection",
        "multiple": true
      }
    ]
  },
  "OpposedToGraphEdges.VectorProvider": {
    "nodeKind": "OpposedToGraphEdges.VectorProvider",
    "title": "[DEV] OpposedToGraphEdges VectorProvider",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "VectorProvider.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "Or.Condition.SpaceAndDepth.MaterialProvider": {
    "nodeKind": "Or.Condition.SpaceAndDepth.MaterialProvider",
    "title": "Or Condition SADMP",
    "fields": [],
    "leftPins": [
      {
        "id": "OutputPin",
        "label": "",
        "type": "Condition.SpaceAndDepth.MaterialProvider.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "ConditionsPin",
        "label": "Conditions",
        "type": "Condition.SpaceAndDepth.MaterialProvider.Connection",
        "multiple": true
      }
    ]
  },
  "Or.ContentPredicate": {
    "nodeKind": "Or.ContentPredicate",
    "title": "[DEV] Or ContentPredicate",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "ContentPredicate.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "ContentPredicates",
        "label": "ContentPredicates",
        "type": "ContentPredicate.Connection",
        "multiple": true
      }
    ]
  },
  "Or.Density": {
    "nodeKind": "Or.Density",
    "title": "Or Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "DensityInputs",
        "label": "Inputs",
        "type": "Density.Connection",
        "multiple": true
      }
    ]
  },
  "Or.EdgeSelector": {
    "nodeKind": "Or.EdgeSelector",
    "title": "[DEV] Or EdgeSelector",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "EdgeSelector.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "EdgeSelectors",
        "label": "EdgeSelectors",
        "type": "EdgeSelector.Connection",
        "multiple": true
      }
    ]
  },
  "Or.NodeSelector": {
    "nodeKind": "Or.NodeSelector",
    "title": "[DEV] Or NodeSelector",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "NodeSelector.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "NodeSelectors",
        "label": "NodeSelectors",
        "type": "NodeSelector.Connection",
        "multiple": true
      }
    ]
  },
  "Or.Pattern": {
    "nodeKind": "Or.Pattern",
    "title": "Or Pattern",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Pattern.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Patterns",
        "label": "Patterns",
        "type": "Pattern.Connection",
        "multiple": true
      }
    ]
  },
  "Orienter.Prop": {
    "nodeKind": "Orienter.Prop",
    "title": "Orienter Prop",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "SelectionMode",
        "jsonKey": "SelectionMode",
        "renderer": "Enum",
        "label": "SelectionMode",
        "requestedWidth": 200
      },
      {
        "id": "Seed",
        "jsonKey": "Seed",
        "renderer": "SmallString",
        "label": "Seed",
        "requestedWidth": 350
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Prop.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Prop",
        "label": "Prop",
        "type": "Prop.Connection",
        "multiple": false
      },
      {
        "id": "Rotations",
        "label": "Rotations",
        "type": "OrthogonalRotation.Rotation.Connection",
        "multiple": true
      },
      {
        "id": "Pattern",
        "label": "Pattern",
        "type": "Pattern.Connection",
        "multiple": false
      },
      {
        "id": "Scanner",
        "label": "Scanner",
        "type": "Scanner.Connection",
        "multiple": false
      }
    ]
  },
  "Origin.Scanner": {
    "nodeKind": "Origin.Scanner",
    "title": "Origin Scanner",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Scanner.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "OrthogonalRotation.Rotation": {
    "nodeKind": "OrthogonalRotation.Rotation",
    "title": "Orthogonal Rotation",
    "fields": [
      {
        "id": "Yaw",
        "jsonKey": "Yaw",
        "renderer": "Enum",
        "label": "Yaw",
        "requestedWidth": 200
      },
      {
        "id": "Pitch",
        "jsonKey": "Pitch",
        "renderer": "Enum",
        "label": "Pitch",
        "requestedWidth": 200
      },
      {
        "id": "Roll",
        "jsonKey": "Roll",
        "renderer": "Enum",
        "label": "Roll",
        "requestedWidth": 200
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "OrthogonalRotation.Rotation.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "Pattern.Directionality": {
    "nodeKind": "Pattern.Directionality",
    "title": "Pattern Directionality",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "InitialDirection",
        "jsonKey": "InitialDirection",
        "renderer": "SmallString",
        "label": "InitialDirection",
        "requestedWidth": 40
      },
      {
        "id": "Seed",
        "jsonKey": "Seed",
        "renderer": "SmallString",
        "label": "Seed",
        "requestedWidth": 350
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Directionality.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "NorthPattern",
        "label": "NorthPattern",
        "type": "Pattern.Connection",
        "multiple": false
      },
      {
        "id": "SouthPattern",
        "label": "SouthPattern",
        "type": "Pattern.Connection",
        "multiple": false
      },
      {
        "id": "EastPattern",
        "label": "EastPattern",
        "type": "Pattern.Connection",
        "multiple": false
      },
      {
        "id": "WestPattern",
        "label": "WestPattern",
        "type": "Pattern.Connection",
        "multiple": false
      }
    ]
  },
  "Plane.Density": {
    "nodeKind": "Plane.Density",
    "title": "Plane Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "IsAnchored",
        "jsonKey": "IsAnchored",
        "renderer": "Checkbox",
        "label": "IsAnchored"
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Curve",
        "label": "Curve",
        "type": "Curve.Connection",
        "multiple": false
      },
      {
        "id": "PlaneNormal",
        "label": "PlaneNormal",
        "type": "Decimal.Vector3d.Connection",
        "multiple": false
      }
    ]
  },
  "PlaneProjector.VectorProvider": {
    "nodeKind": "PlaneProjector.VectorProvider",
    "title": "PlaneProjector VectorProvider",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "VectorProvider.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Vector",
        "label": "Vector",
        "type": "VectorProvider.Connection",
        "multiple": false
      },
      {
        "id": "PlaneA",
        "label": "PlaneA",
        "type": "VectorProvider.Connection",
        "multiple": false
      },
      {
        "id": "PlaneB",
        "label": "PlaneB",
        "type": "VectorProvider.Connection",
        "multiple": false
      }
    ]
  },
  "Point.FunctionForY": {
    "nodeKind": "Point.FunctionForY",
    "title": "FunctionForY Point",
    "fields": [
      {
        "id": "Y",
        "jsonKey": "Y",
        "renderer": "Float",
        "label": "Y",
        "requestedWidth": 100
      },
      {
        "id": "Out",
        "jsonKey": "Out",
        "renderer": "Float",
        "label": "Out",
        "requestedWidth": 100
      }
    ],
    "leftPins": [
      {
        "id": "Connection",
        "label": "",
        "type": "Point.FunctionForY.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "PondFiller.Prop": {
    "nodeKind": "PondFiller.Prop",
    "title": "PondFiller Prop",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Prop.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Bounds",
        "label": "Bounds",
        "type": "Integer.Bounds3d.Connection",
        "multiple": false
      },
      {
        "id": "BarrierBlockSet",
        "label": "BarrierBlockSet",
        "type": "BlockSet.BlockMask.Connection",
        "multiple": false
      },
      {
        "id": "FillMaterial",
        "label": "FillMaterial",
        "type": "MaterialProvider.Connection",
        "multiple": false
      },
      {
        "id": "BoundingMin",
        "label": "[DEPRECATED] BoundingMin",
        "type": "Decimal.Vector3d.Connection",
        "multiple": false
      },
      {
        "id": "BoundingMax",
        "label": "[DEPRECATED] BoundingMax",
        "type": "Decimal.Vector3d.Connection",
        "multiple": false
      },
      {
        "id": "Pattern",
        "label": "[DEPRECATED] Pattern",
        "type": "Pattern.Connection",
        "multiple": false
      },
      {
        "id": "Scanner",
        "label": "[DEPRECATED] Scanner",
        "type": "Scanner.Connection",
        "multiple": false
      }
    ]
  },
  "Positions.GraphPass": {
    "nodeKind": "Positions.GraphPass",
    "title": "[DEV] Positions GraphPass",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "StatsLabel",
        "jsonKey": "StatsLabel",
        "renderer": "SmallString",
        "label": "StatsLabel",
        "requestedWidth": 250
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "GraphPass.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Positions",
        "label": "Positions",
        "type": "Positions.Connection",
        "multiple": false
      }
    ]
  },
  "Positions.NodeContent": {
    "nodeKind": "Positions.NodeContent",
    "title": "[DEV] Positions NodeContent",
    "fields": [
      {
        "id": "ContentLayer",
        "jsonKey": "ContentLayer",
        "renderer": "SmallString",
        "label": "ContentLayer",
        "requestedWidth": 350
      },
      {
        "id": "Range",
        "jsonKey": "Range",
        "renderer": "Float",
        "label": "Range"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Positions.NodeContent.Graph.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Positions",
        "label": "Positions",
        "type": "Positions.Connection",
        "multiple": false
      }
    ]
  },
  "Positions.PropDistribution": {
    "nodeKind": "Positions.PropDistribution",
    "title": "Positions PropDistribution",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "OutputPin",
        "label": "",
        "type": "PropDistribution.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Positions",
        "label": "Positions",
        "type": "Positions.Connection",
        "multiple": false
      }
    ]
  },
  "PositionsCellNoise.Density": {
    "nodeKind": "PositionsCellNoise.Density",
    "title": "PositionsCellNoise Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "MaxDistance",
        "jsonKey": "MaxDistance",
        "renderer": "Float",
        "label": "MaxDistance",
        "requestedWidth": 100
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Positions",
        "label": "Positions",
        "type": "Positions.Connection",
        "multiple": false
      },
      {
        "id": "DistanceFunction",
        "label": "DistanceFunction",
        "type": "DistanceFunction.PositionsCellNoise.Density.Connection",
        "multiple": false
      },
      {
        "id": "ReturnType",
        "label": "ReturnType",
        "type": "ReturnType.PositionsCellNoise.Density.Connection",
        "multiple": false
      }
    ]
  },
  "PositionsPinch.Density": {
    "nodeKind": "PositionsPinch.Density",
    "title": "PositionsPinch Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "MaxDistance",
        "jsonKey": "MaxDistance",
        "renderer": "Float",
        "label": "MaxDistance",
        "requestedWidth": 100
      },
      {
        "id": "NormalizeDistance",
        "jsonKey": "NormalizeDistance",
        "renderer": "Checkbox",
        "label": "NormalizeDistance"
      },
      {
        "id": "HorizontalPinch",
        "jsonKey": "HorizontalPinch",
        "renderer": "Checkbox",
        "label": "HorizontalPinch"
      },
      {
        "id": "PositionsMaxY",
        "jsonKey": "PositionsMaxY",
        "renderer": "Float",
        "label": "PositionsMaxY",
        "requestedWidth": 100
      },
      {
        "id": "PositionsMinY",
        "jsonKey": "PositionsMinY",
        "renderer": "Float",
        "label": "PositionsMinY",
        "requestedWidth": 100
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "DensityInputs",
        "label": "Inputs",
        "type": "Density.Connection",
        "multiple": true
      },
      {
        "id": "Positions",
        "label": "Positions",
        "type": "Positions.Connection",
        "multiple": false
      },
      {
        "id": "PinchCurve",
        "label": "PinchCurve",
        "type": "Curve.Connection",
        "multiple": false
      }
    ]
  },
  "PositionsTwist.Density": {
    "nodeKind": "PositionsTwist.Density",
    "title": "PositionsTwist Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "MaxDistance",
        "jsonKey": "MaxDistance",
        "renderer": "Float",
        "label": "MaxDistance",
        "requestedWidth": 100
      },
      {
        "id": "NormalizeDistance",
        "jsonKey": "NormalizeDistance",
        "renderer": "Checkbox",
        "label": "NormalizeDistance"
      },
      {
        "id": "ZeroPositionsY",
        "jsonKey": "ZeroPositionsY",
        "renderer": "Checkbox",
        "label": "ZeroPositionsY"
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "DensityInputs",
        "label": "Inputs",
        "type": "Density.Connection",
        "multiple": true
      },
      {
        "id": "Positions",
        "label": "Positions",
        "type": "Positions.Connection",
        "multiple": false
      },
      {
        "id": "TwistCurve",
        "label": "TwistCurve",
        "type": "Curve.Connection",
        "multiple": false
      },
      {
        "id": "TwistAxis",
        "label": "TwistAxis",
        "type": "Decimal.Vector3d.Connection",
        "multiple": false
      }
    ]
  },
  "Pow.Density": {
    "nodeKind": "Pow.Density",
    "title": "Pow Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "Exponent",
        "jsonKey": "Exponent",
        "renderer": "Float",
        "label": "Exponent",
        "requestedWidth": 100
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "DensityInputs",
        "label": "Inputs",
        "type": "Density.Connection",
        "multiple": true
      }
    ]
  },
  "Prefab.Prop": {
    "nodeKind": "Prefab.Prop",
    "title": "Prefab Prop",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "LegacyPath",
        "jsonKey": "LegacyPath",
        "renderer": "Checkbox",
        "label": "[DEPRECATED] LegacyPath"
      },
      {
        "id": "MoldingDirection",
        "jsonKey": "MoldingDirection",
        "renderer": "SmallString",
        "label": "[DEPRECATED] MoldingDirection"
      },
      {
        "id": "MoldingChildren",
        "jsonKey": "MoldingChildren",
        "renderer": "Checkbox",
        "label": "[DEPRECATED] MoldingChildren"
      },
      {
        "id": "LoadEntities",
        "jsonKey": "LoadEntities",
        "renderer": "Checkbox",
        "label": "[DEPRECATED] LoadEntities"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Prop.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "WeightedPrefabPaths",
        "label": "WeightedPrefabPaths",
        "type": "WeightedPath.Prefab.Prop.Connection",
        "multiple": true
      },
      {
        "id": "Directionality",
        "label": "[DEPRECATED] Directionality",
        "type": "Directionality.Connection",
        "multiple": false
      },
      {
        "id": "Scanner",
        "label": "[DEPRECATED] Scanner",
        "type": "Scanner.Connection",
        "multiple": false
      },
      {
        "id": "BlockMask",
        "label": "[DEPRECATED] BlockMask",
        "type": "BlockMask.Connection",
        "multiple": false
      },
      {
        "id": "MoldingScanner",
        "label": "[DEPRECATED] MoldingScanner",
        "type": "Scanner.Connection",
        "multiple": false
      },
      {
        "id": "MoldingPattern",
        "label": "[DEPRECATED] MoldingPattern",
        "type": "Pattern.Connection",
        "multiple": false
      }
    ]
  },
  "PropDistribution.NodeContent": {
    "nodeKind": "PropDistribution.NodeContent",
    "title": "[DEV] PropDistribution NodeContent",
    "fields": [
      {
        "id": "ContentLayer",
        "jsonKey": "ContentLayer",
        "renderer": "SmallString",
        "label": "ContentLayer",
        "requestedWidth": 350
      },
      {
        "id": "Range",
        "jsonKey": "Range",
        "renderer": "Float",
        "label": "Range"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "PropDistribution.NodeContent.Graph.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "PropDistribution",
        "label": "PropDistribution",
        "type": "PropDistribution.Connection",
        "multiple": false
      }
    ]
  },
  "ProximityConnector.NodeAction": {
    "nodeKind": "ProximityConnector.NodeAction",
    "title": "[DEV] ProximityConnector NodeAction",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "Range",
        "jsonKey": "Range",
        "renderer": "Float",
        "label": "Range"
      },
      {
        "id": "Cap",
        "jsonKey": "Cap",
        "renderer": "Int",
        "label": "Cap"
      },
      {
        "id": "Seed",
        "jsonKey": "Seed",
        "renderer": "SmallString",
        "label": "Seed",
        "requestedWidth": 350
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "NodeAction.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "NodeSelector",
        "label": "NodeSelector",
        "type": "NodeSelector.Connection",
        "multiple": false
      }
    ]
  },
  "Proxy.EdgeAction": {
    "nodeKind": "Proxy.EdgeAction",
    "title": "[DEV] Proxy EdgeAction",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "MaxProxyDistance",
        "jsonKey": "MaxProxyDistance",
        "renderer": "Float",
        "label": "MaxProxyDistance"
      },
      {
        "id": "Seed",
        "jsonKey": "Seed",
        "renderer": "SmallString",
        "label": "Seed",
        "requestedWidth": 350
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "EdgeAction.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "HostNodeSelector",
        "label": "HostNodeSelector",
        "type": "NodeSelector.Connection",
        "multiple": false
      },
      {
        "id": "Normal",
        "label": "Normal",
        "type": "VectorProvider.Connection",
        "multiple": false
      },
      {
        "id": "AngleToNormal",
        "label": "AngleToNormal",
        "type": "Density.Connection",
        "multiple": false
      },
      {
        "id": "SpinAngle",
        "label": "SpinAngle",
        "type": "Density.Connection",
        "multiple": false
      },
      {
        "id": "ProxyDistance",
        "label": "ProxyDistance",
        "type": "Density.Connection",
        "multiple": false
      },
      {
        "id": "ProxyContent",
        "label": "ProxyContent",
        "type": "ContentSupplier.Connection",
        "multiple": false
      }
    ]
  },
  "Queue.MaterialProvider": {
    "nodeKind": "Queue.MaterialProvider",
    "title": "Queue MaterialProvider",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "OutputPin",
        "label": "",
        "type": "MaterialProvider.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "QueuePin",
        "label": "Queue",
        "type": "MaterialProvider.Connection",
        "multiple": true
      }
    ]
  },
  "Queue.Prop": {
    "nodeKind": "Queue.Prop",
    "title": "Queue Prop",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Prop.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Props",
        "label": "Props",
        "type": "Prop.Connection",
        "multiple": true
      }
    ]
  },
  "Queue.Scanner": {
    "nodeKind": "Queue.Scanner",
    "title": "Queue Scanner",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Scanner.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Scanners",
        "label": "Scanners",
        "type": "Scanner.Connection",
        "multiple": true
      }
    ]
  },
  "Radial.Scanner": {
    "nodeKind": "Radial.Scanner",
    "title": "Radial Scanner",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Scanner.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Scanner",
        "label": "Scanner",
        "type": "Scanner.Connection",
        "multiple": false
      },
      {
        "id": "Bounds",
        "label": "Bounds",
        "type": "Decimal.Bounds3d.Connection",
        "multiple": false
      }
    ]
  },
  "Random.Directionality": {
    "nodeKind": "Random.Directionality",
    "title": "Random Directionality",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Seed",
        "jsonKey": "Seed",
        "renderer": "SmallString",
        "label": "Seed",
        "requestedWidth": 350
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Directionality.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Pattern",
        "label": "Pattern",
        "type": "Pattern.Connection",
        "multiple": false
      }
    ]
  },
  "Random.EdgeSelector": {
    "nodeKind": "Random.EdgeSelector",
    "title": "[DEV] Random EdgeSelector",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "Chance",
        "jsonKey": "Chance",
        "renderer": "Float",
        "label": "Chance",
        "requestedWidth": 150
      },
      {
        "id": "Seed",
        "jsonKey": "Seed",
        "renderer": "SmallString",
        "label": "Seed",
        "requestedWidth": 350
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "EdgeSelector.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "Random.NodeSelector": {
    "nodeKind": "Random.NodeSelector",
    "title": "[DEV] Random NodeSelector",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "Chance",
        "jsonKey": "Chance",
        "renderer": "Float",
        "label": "Chance",
        "requestedWidth": 100
      },
      {
        "id": "Seed",
        "jsonKey": "Seed",
        "renderer": "SmallString",
        "label": "Seed",
        "requestedWidth": 350
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "NodeSelector.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "Random.Scanner": {
    "nodeKind": "Random.Scanner",
    "title": "Random Scanner",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "Axis",
        "jsonKey": "Axis",
        "renderer": "Enum",
        "label": "Axis"
      },
      {
        "id": "Seed",
        "jsonKey": "Seed",
        "renderer": "SmallString",
        "label": "Seed",
        "requestedWidth": 350
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Scanner.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Scanner",
        "label": "Scanner",
        "type": "Scanner.Connection",
        "multiple": false
      },
      {
        "id": "Range",
        "label": "Range",
        "type": "Integer.Range.Connection",
        "multiple": false
      }
    ]
  },
  "Random.VectorProvider": {
    "nodeKind": "Random.VectorProvider",
    "title": "Random VectorProvider",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Seed",
        "jsonKey": "Seed",
        "renderer": "SmallString",
        "label": "Seed",
        "requestedWidth": 350
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "VectorProvider.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "RandomRotator.Prop": {
    "nodeKind": "RandomRotator.Prop",
    "title": "RandomRotator Prop",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "HorizontalRotations",
        "jsonKey": "HorizontalRotations",
        "renderer": "Checkbox",
        "label": "HorizontalRotations"
      },
      {
        "id": "Seed",
        "jsonKey": "Seed",
        "renderer": "SmallString",
        "label": "Seed",
        "requestedWidth": 350
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Prop.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Prop",
        "label": "Prop",
        "type": "Prop.Connection",
        "multiple": false
      },
      {
        "id": "Rotations",
        "label": "Rotations",
        "type": "OrthogonalRotation.Rotation.Connection",
        "multiple": true
      }
    ]
  },
  "RangeThickness.Layer.SpaceAndDepth.MaterialProvider": {
    "nodeKind": "RangeThickness.Layer.SpaceAndDepth.MaterialProvider",
    "title": "RangeThickness Layer SADMP",
    "fields": [
      {
        "id": "RangeMax",
        "jsonKey": "RangeMax",
        "renderer": "Int",
        "label": "RangeMax",
        "requestedWidth": 50
      },
      {
        "id": "RangeMin",
        "jsonKey": "RangeMin",
        "renderer": "Int",
        "label": "RangeMin",
        "requestedWidth": 50
      },
      {
        "id": "Seed",
        "jsonKey": "Seed",
        "renderer": "SmallString",
        "label": "Seed",
        "requestedWidth": 350
      }
    ],
    "leftPins": [
      {
        "id": "OutputPin",
        "label": "",
        "type": "Layer.SpaceAndDepth.MaterialProvider.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "MaterialPin",
        "label": "Material",
        "type": "MaterialProvider.Connection",
        "multiple": false
      }
    ]
  },
  "RootNode": {
    "nodeKind": "RootNode",
    "title": "Output",
    "fields": [],
    "leftPins": [],
    "rightPins": [
      {
        "id": "Outputs",
        "label": "RootNode",
        "type": "Density.Connection",
        "multiple": false
      }
    ]
  },
  "Rotator.Density": {
    "nodeKind": "Rotator.Density",
    "title": "Rotator Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "SpinAngle",
        "jsonKey": "SpinAngle",
        "renderer": "Float",
        "label": "SpinAngle"
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "DensityInputs",
        "label": "Inputs",
        "type": "Density.Connection",
        "multiple": true
      },
      {
        "id": "NewYAxis",
        "label": "NewYAxis",
        "type": "Decimal.Vector3d.Connection",
        "multiple": false
      }
    ]
  },
  "Rotator.Pattern": {
    "nodeKind": "Rotator.Pattern",
    "title": "Rotator Pattern",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Pattern.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Pattern",
        "label": "Pattern",
        "type": "Pattern.Connection",
        "multiple": false
      },
      {
        "id": "Rotation",
        "label": "Rotation",
        "type": "OrthogonalRotation.Rotation.Connection",
        "multiple": false
      }
    ]
  },
  "Rule.BlockMask": {
    "nodeKind": "Rule.BlockMask",
    "title": "Rule BlockMask",
    "fields": [],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Rule.BlockMask.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Source",
        "label": "Source",
        "type": "BlockSet.BlockMask.Connection",
        "multiple": false
      },
      {
        "id": "CanReplace",
        "label": "CanReplace",
        "type": "BlockSet.BlockMask.Connection",
        "multiple": false
      }
    ]
  },
  "Runtime": {
    "nodeKind": "Runtime",
    "title": "Runtime",
    "fields": [
      {
        "id": "Runtime",
        "jsonKey": "Runtime",
        "renderer": "Int",
        "label": "Runtime",
        "requestedWidth": 40
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Runtime.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Positions",
        "label": "[DEPRECATED] Positions",
        "type": "Positions.Connection",
        "multiple": false
      },
      {
        "id": "Assignments",
        "label": "[DEPRECATED] Assignments",
        "type": "Assignments.Connection",
        "multiple": false
      },
      {
        "id": "PropDistribution",
        "label": "PropDistribution",
        "type": "PropDistribution.Connection",
        "multiple": false
      }
    ]
  },
  "Sandwich.Assignments": {
    "nodeKind": "Sandwich.Assignments",
    "title": "Sandwich Assignments",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Assignments.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Delimiters.Pin",
        "label": "Delimiters",
        "type": "Delimiter.Sandwich.Assignments.Connection",
        "multiple": true
      }
    ]
  },
  "ScalarMultiplier.VectorProvider": {
    "nodeKind": "ScalarMultiplier.VectorProvider",
    "title": "ScalarMultiplier VectorProvider",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "VectorProvider.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Vector",
        "label": "Vector",
        "type": "VectorProvider.Connection",
        "multiple": false
      },
      {
        "id": "Scalar",
        "label": "Scalar",
        "type": "Density.Connection",
        "multiple": false
      }
    ]
  },
  "Scale.Density": {
    "nodeKind": "Scale.Density",
    "title": "Scale Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "ScaleX",
        "jsonKey": "ScaleX",
        "renderer": "Float",
        "label": "ScaleX",
        "requestedWidth": 70
      },
      {
        "id": "ScaleY",
        "jsonKey": "ScaleY",
        "renderer": "Float",
        "label": "ScaleY",
        "requestedWidth": 70
      },
      {
        "id": "ScaleZ",
        "jsonKey": "ScaleZ",
        "renderer": "Float",
        "label": "ScaleZ",
        "requestedWidth": 70
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "DensityInputs",
        "label": "Inputs",
        "type": "Density.Connection",
        "multiple": true
      }
    ]
  },
  "Scaler.Positions": {
    "nodeKind": "Scaler.Positions",
    "title": "Scaler Positions",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Positions.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Positions",
        "label": "Positions",
        "type": "Positions.Connection",
        "multiple": false
      },
      {
        "id": "Scale",
        "label": "Scale",
        "type": "Decimal.Vector3d.Connection",
        "multiple": false
      }
    ]
  },
  "Selector.Density": {
    "nodeKind": "Selector.Density",
    "title": "Selector Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "DensityInputs",
        "label": "Inputs",
        "type": "Density.Connection",
        "multiple": true
      }
    ]
  },
  "Selector.EdgeAction": {
    "nodeKind": "Selector.EdgeAction",
    "title": "[DEV] Selector EdgeAction",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "EdgeAction.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "EdgeSelector",
        "label": "EdgeSelector",
        "type": "EdgeSelector.Connection",
        "multiple": false
      },
      {
        "id": "EdgeAction",
        "label": "EdgeAction",
        "type": "EdgeAction.Connection",
        "multiple": false
      }
    ]
  },
  "Selector.NodeAction": {
    "nodeKind": "Selector.NodeAction",
    "title": "[DEV] Selector NodeAction",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "NodeAction.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "NodeSelector",
        "label": "NodeSelector",
        "type": "NodeSelector.Connection",
        "multiple": false
      },
      {
        "id": "NodeAction",
        "label": "NodeAction",
        "type": "NodeAction.Connection",
        "multiple": false
      }
    ]
  },
  "Set.ContentPredicate": {
    "nodeKind": "Set.ContentPredicate",
    "title": "[DEV] Set ContentPredicate",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "ContentTags",
        "jsonKey": "ContentTags",
        "renderer": "List",
        "label": "ContentTags",
        "requestedWidth": 350,
        "itemType": "String"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "ContentPredicate.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "SetX.VectorProvider": {
    "nodeKind": "SetX.VectorProvider",
    "title": "SetX VectorProvider",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "VectorProvider.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Vector",
        "label": "Vector",
        "type": "VectorProvider.Connection",
        "multiple": false
      },
      {
        "id": "Value",
        "label": "Value",
        "type": "Density.Connection",
        "multiple": false
      }
    ]
  },
  "SetY.VectorProvider": {
    "nodeKind": "SetY.VectorProvider",
    "title": "SetY VectorProvider",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "VectorProvider.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Vector",
        "label": "Vector",
        "type": "VectorProvider.Connection",
        "multiple": false
      },
      {
        "id": "Value",
        "label": "Value",
        "type": "Density.Connection",
        "multiple": false
      }
    ]
  },
  "SetZ.VectorProvider": {
    "nodeKind": "SetZ.VectorProvider",
    "title": "SetZ VectorProvider",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "VectorProvider.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Vector",
        "label": "Vector",
        "type": "VectorProvider.Connection",
        "multiple": false
      },
      {
        "id": "Value",
        "label": "Value",
        "type": "Density.Connection",
        "multiple": false
      }
    ]
  },
  "Shell.Density": {
    "nodeKind": "Shell.Density",
    "title": "Shell Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "Mirror",
        "jsonKey": "Mirror",
        "renderer": "Checkbox",
        "label": "Mirror"
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "AngleCurve",
        "label": "AngleCurve",
        "type": "Curve.Connection",
        "multiple": false
      },
      {
        "id": "DistanceCurve",
        "label": "DistanceCurve",
        "type": "Curve.Connection",
        "multiple": false
      },
      {
        "id": "Axis",
        "label": "Axis",
        "type": "Decimal.Vector3d.Connection",
        "multiple": false
      }
    ]
  },
  "SimpleHorizontal.MaterialProvider": {
    "nodeKind": "SimpleHorizontal.MaterialProvider",
    "title": "SimpleHorizontal MaterialProvider",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "TopY",
        "jsonKey": "TopY",
        "renderer": "Int",
        "label": "TopY",
        "requestedWidth": 50
      },
      {
        "id": "TopBaseHeight",
        "jsonKey": "TopBaseHeight",
        "renderer": "SmallString",
        "label": "Top BaseHeight",
        "requestedWidth": 250
      },
      {
        "id": "BottomY",
        "jsonKey": "BottomY",
        "renderer": "Int",
        "label": "BottomY",
        "requestedWidth": 50
      },
      {
        "id": "BottomBaseHeight",
        "jsonKey": "BottomBaseHeight",
        "renderer": "SmallString",
        "label": "Bottom BaseHeight",
        "requestedWidth": 250
      }
    ],
    "leftPins": [
      {
        "id": "OutputPin",
        "label": "",
        "type": "MaterialProvider.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "MaterialPin",
        "label": "Material",
        "type": "MaterialProvider.Connection",
        "multiple": false
      }
    ]
  },
  "SimpleHorizontal.Positions": {
    "nodeKind": "SimpleHorizontal.Positions",
    "title": "SimpleHorizontal Positions",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Positions.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Positions",
        "label": "Positions",
        "type": "Positions.Connection",
        "multiple": false
      },
      {
        "id": "RangeY",
        "label": "RangeY",
        "type": "Decimal.Range.Connection",
        "multiple": false
      }
    ]
  },
  "SimplexNoise2D.Density": {
    "nodeKind": "SimplexNoise2D.Density",
    "title": "SimplexNoise2D Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "Lacunarity",
        "jsonKey": "Lacunarity",
        "renderer": "Float",
        "label": "Lacunarity",
        "requestedWidth": 100
      },
      {
        "id": "Persistence",
        "jsonKey": "Persistence",
        "renderer": "Float",
        "label": "Persistence",
        "requestedWidth": 100
      },
      {
        "id": "Scale",
        "jsonKey": "Scale",
        "renderer": "Float",
        "label": "Scale",
        "requestedWidth": 100
      },
      {
        "id": "Octaves",
        "jsonKey": "Octaves",
        "renderer": "IntSlider",
        "label": "Octaves",
        "requestedWidth": 150
      },
      {
        "id": "Seed",
        "jsonKey": "Seed",
        "renderer": "SmallString",
        "label": "Seed",
        "requestedWidth": 350
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "SimplexNoise3D.Density": {
    "nodeKind": "SimplexNoise3D.Density",
    "title": "SimplexNoise3D Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "Lacunarity",
        "jsonKey": "Lacunarity",
        "renderer": "Float",
        "label": "Lacunarity",
        "requestedWidth": 100
      },
      {
        "id": "Persistence",
        "jsonKey": "Persistence",
        "renderer": "Float",
        "label": "Persistence",
        "requestedWidth": 100
      },
      {
        "id": "ScaleXZ",
        "jsonKey": "ScaleXZ",
        "renderer": "Float",
        "label": "ScaleXZ",
        "requestedWidth": 100
      },
      {
        "id": "ScaleY",
        "jsonKey": "ScaleY",
        "renderer": "Float",
        "label": "ScaleY",
        "requestedWidth": 100
      },
      {
        "id": "Octaves",
        "jsonKey": "Octaves",
        "renderer": "IntSlider",
        "label": "Octaves",
        "requestedWidth": 150
      },
      {
        "id": "Seed",
        "jsonKey": "Seed",
        "renderer": "SmallString",
        "label": "Seed",
        "requestedWidth": 350
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "Slider.Density": {
    "nodeKind": "Slider.Density",
    "title": "Slider Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "SlideX",
        "jsonKey": "SlideX",
        "renderer": "Float",
        "label": "SlideX",
        "requestedWidth": 70
      },
      {
        "id": "SlideY",
        "jsonKey": "SlideY",
        "renderer": "Float",
        "label": "SlideY",
        "requestedWidth": 70
      },
      {
        "id": "SlideZ",
        "jsonKey": "SlideZ",
        "renderer": "Float",
        "label": "SlideZ",
        "requestedWidth": 70
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "DensityInputs",
        "label": "Inputs",
        "type": "Density.Connection",
        "multiple": true
      }
    ]
  },
  "SmallerThan.Condition.SpaceAndDepth.MaterialProvider": {
    "nodeKind": "SmallerThan.Condition.SpaceAndDepth.MaterialProvider",
    "title": "SmallerThan Condition SADMP",
    "fields": [
      {
        "id": "ContextToCheck",
        "jsonKey": "ContextToCheck",
        "renderer": "SmallString",
        "label": "ContextToCheck",
        "requestedWidth": 200
      },
      {
        "id": "Threshold",
        "jsonKey": "Threshold",
        "renderer": "Int",
        "label": "Threshold",
        "requestedWidth": 50
      }
    ],
    "leftPins": [
      {
        "id": "OutputPin",
        "label": "",
        "type": "Condition.SpaceAndDepth.MaterialProvider.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "SmoothCeiling.Curve": {
    "nodeKind": "SmoothCeiling.Curve",
    "title": "SmoothCeiling Curve",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Ceiling_",
        "jsonKey": "Ceiling_",
        "renderer": "Float",
        "label": "Ceiling",
        "requestedWidth": 100
      },
      {
        "id": "Range",
        "jsonKey": "Range",
        "renderer": "Float",
        "label": "Range",
        "requestedWidth": 100
      }
    ],
    "leftPins": [
      {
        "id": "Input",
        "label": "",
        "type": "Curve.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Curve",
        "label": "Curve",
        "type": "Curve.Connection",
        "multiple": false
      }
    ]
  },
  "SmoothCeiling.Density": {
    "nodeKind": "SmoothCeiling.Density",
    "title": "[DEPRECATED] SmoothCeiling Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "Range",
        "jsonKey": "Range",
        "renderer": "Float",
        "label": "Value",
        "requestedWidth": 100
      },
      {
        "id": "Limit",
        "jsonKey": "Limit",
        "renderer": "Float",
        "label": "Value",
        "requestedWidth": 100
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "DensityInputs",
        "label": "Inputs",
        "type": "Density.Connection",
        "multiple": true
      }
    ]
  },
  "SmoothClamp.Curve": {
    "nodeKind": "SmoothClamp.Curve",
    "title": "SmoothClamp Curve",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "WallA",
        "jsonKey": "WallA",
        "renderer": "Float",
        "label": "WallA",
        "requestedWidth": 100
      },
      {
        "id": "WallB",
        "jsonKey": "WallB",
        "renderer": "Float",
        "label": "WallB",
        "requestedWidth": 100
      },
      {
        "id": "Range",
        "jsonKey": "Range",
        "renderer": "Float",
        "label": "Range",
        "requestedWidth": 100
      }
    ],
    "leftPins": [
      {
        "id": "Input",
        "label": "",
        "type": "Curve.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Curve",
        "label": "Curve",
        "type": "Curve.Connection",
        "multiple": false
      }
    ]
  },
  "SmoothClamp.Density": {
    "nodeKind": "SmoothClamp.Density",
    "title": "SmoothClamp Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "WallA",
        "jsonKey": "WallA",
        "renderer": "Float",
        "label": "WallA",
        "requestedWidth": 100
      },
      {
        "id": "WallB",
        "jsonKey": "WallB",
        "renderer": "Float",
        "label": "WallB",
        "requestedWidth": 100
      },
      {
        "id": "Range",
        "jsonKey": "Range",
        "renderer": "Float",
        "label": "Range",
        "requestedWidth": 100
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "DensityInputs",
        "label": "Inputs",
        "type": "Density.Connection",
        "multiple": true
      }
    ]
  },
  "SmoothFloor.Curve": {
    "nodeKind": "SmoothFloor.Curve",
    "title": "SmoothFloor Curve",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Floor_",
        "jsonKey": "Floor_",
        "renderer": "Float",
        "label": "Floor",
        "requestedWidth": 100
      },
      {
        "id": "Range",
        "jsonKey": "Range",
        "renderer": "Float",
        "label": "Range",
        "requestedWidth": 100
      }
    ],
    "leftPins": [
      {
        "id": "Input",
        "label": "",
        "type": "Curve.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Curve",
        "label": "Curve",
        "type": "Curve.Connection",
        "multiple": false
      }
    ]
  },
  "SmoothFloor.Density": {
    "nodeKind": "SmoothFloor.Density",
    "title": "[DEPRECATED] SmoothFloor Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "Range",
        "jsonKey": "Range",
        "renderer": "Float",
        "label": "Value",
        "requestedWidth": 100
      },
      {
        "id": "Limit",
        "jsonKey": "Limit",
        "renderer": "Float",
        "label": "Value",
        "requestedWidth": 100
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "DensityInputs",
        "label": "Inputs",
        "type": "Density.Connection",
        "multiple": true
      }
    ]
  },
  "SmoothMax.Curve": {
    "nodeKind": "SmoothMax.Curve",
    "title": "SmoothMax Curve",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Range",
        "jsonKey": "Range",
        "renderer": "Float",
        "label": "Range",
        "requestedWidth": 100
      }
    ],
    "leftPins": [
      {
        "id": "Input",
        "label": "",
        "type": "Curve.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "CurveA",
        "label": "CurveA",
        "type": "Curve.Connection",
        "multiple": false
      },
      {
        "id": "CurveB",
        "label": "CurveB",
        "type": "Curve.Connection",
        "multiple": false
      }
    ]
  },
  "SmoothMax.Density": {
    "nodeKind": "SmoothMax.Density",
    "title": "SmoothMax Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "Range",
        "jsonKey": "Range",
        "renderer": "Float",
        "label": "Value",
        "requestedWidth": 100
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "DensityInputs",
        "label": "Inputs",
        "type": "Density.Connection",
        "multiple": true
      }
    ]
  },
  "SmoothMin.Curve": {
    "nodeKind": "SmoothMin.Curve",
    "title": "SmoothMin Curve",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Range",
        "jsonKey": "Range",
        "renderer": "Float",
        "label": "Range",
        "requestedWidth": 100
      }
    ],
    "leftPins": [
      {
        "id": "Input",
        "label": "",
        "type": "Curve.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "CurveA",
        "label": "CurveA",
        "type": "Curve.Connection",
        "multiple": false
      },
      {
        "id": "CurveB",
        "label": "CurveB",
        "type": "Curve.Connection",
        "multiple": false
      }
    ]
  },
  "SmoothMin.Density": {
    "nodeKind": "SmoothMin.Density",
    "title": "SmoothMin Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "Range",
        "jsonKey": "Range",
        "renderer": "Float",
        "label": "Value",
        "requestedWidth": 100
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "DensityInputs",
        "label": "Inputs",
        "type": "Density.Connection",
        "multiple": true
      }
    ]
  },
  "Solidity.MaterialProvider": {
    "nodeKind": "Solidity.MaterialProvider",
    "title": "Solidity MaterialProvider",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "OutputPin",
        "label": "",
        "type": "MaterialProvider.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "SolidPin",
        "label": "Solid",
        "type": "MaterialProvider.Connection",
        "multiple": false
      },
      {
        "id": "EmptyPin",
        "label": "Empty",
        "type": "MaterialProvider.Connection",
        "multiple": false
      }
    ]
  },
  "SpaceAndDepth.MaterialProvider": {
    "nodeKind": "SpaceAndDepth.MaterialProvider",
    "title": "SpaceAndDepth MaterialProvider",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "LayerContext",
        "jsonKey": "LayerContext",
        "renderer": "Enum",
        "label": "LayerContext",
        "requestedWidth": 200
      },
      {
        "id": "MaxExpectedDepth",
        "jsonKey": "MaxExpectedDepth",
        "renderer": "Int",
        "label": "MaxExpectedDepth",
        "requestedWidth": 50
      }
    ],
    "leftPins": [
      {
        "id": "OutputPin",
        "label": "",
        "type": "MaterialProvider.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "ConditionPin",
        "label": "Condition",
        "type": "Condition.SpaceAndDepth.MaterialProvider.Connection",
        "multiple": false
      },
      {
        "id": "LayersPin",
        "label": "Layers",
        "type": "Layer.SpaceAndDepth.MaterialProvider.Connection",
        "multiple": true
      }
    ]
  },
  "Spawner.NodeAction": {
    "nodeKind": "Spawner.NodeAction",
    "title": "[DEV] Spawner NodeAction",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "MaxOffsetExclusive",
        "jsonKey": "MaxOffsetExclusive",
        "renderer": "Float",
        "label": "MaxOffsetExclusive"
      },
      {
        "id": "CreateEdges",
        "jsonKey": "CreateEdges",
        "renderer": "Checkbox",
        "label": "CreateEdges"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "NodeAction.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Offset",
        "label": "Offset",
        "type": "VectorProvider.Connection",
        "multiple": false
      },
      {
        "id": "Positions",
        "label": "Positions",
        "type": "Positions.Connection",
        "multiple": false
      },
      {
        "id": "Content",
        "label": "Content",
        "type": "ContentSupplier.Connection",
        "multiple": false
      },
      {
        "id": "ClusterBounds",
        "label": "ClusterBounds",
        "type": "Decimal.Bounds3d.Connection",
        "multiple": false
      }
    ]
  },
  "Splitter.EdgeAction": {
    "nodeKind": "Splitter.EdgeAction",
    "title": "[DEV] Splitter EdgeAction",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "NodeCount",
        "jsonKey": "NodeCount",
        "renderer": "Int",
        "label": "NodeCount"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "EdgeAction.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Content",
        "label": "Content",
        "type": "ContentSupplier.Connection",
        "multiple": false
      }
    ]
  },
  "Sqrt.Density": {
    "nodeKind": "Sqrt.Density",
    "title": "Sqrt Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "DensityInputs",
        "label": "Inputs",
        "type": "Density.Connection",
        "multiple": true
      }
    ]
  },
  "SquareGrid2d.Positions": {
    "nodeKind": "SquareGrid2d.Positions",
    "title": "SquareGrid2d Positions",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Positions.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "SquareGrid3d.Positions": {
    "nodeKind": "SquareGrid3d.Positions",
    "title": "SquareGrid3d Positions",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Positions.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "Static.Directionality": {
    "nodeKind": "Static.Directionality",
    "title": "Static Directionality",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Rotation",
        "jsonKey": "Rotation",
        "renderer": "Int",
        "label": "Rotation",
        "requestedWidth": 50
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Directionality.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Pattern",
        "label": "Pattern",
        "type": "Pattern.Connection",
        "multiple": false
      }
    ]
  },
  "StaticRotator.Prop": {
    "nodeKind": "StaticRotator.Prop",
    "title": "StaticRotator Prop",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Prop.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Prop",
        "label": "Prop",
        "type": "Prop.Connection",
        "multiple": false
      },
      {
        "id": "Rotation",
        "label": "Rotation",
        "type": "OrthogonalRotation.Rotation.Connection",
        "multiple": false
      }
    ]
  },
  "Stripe.Striped.MaterialProvider": {
    "nodeKind": "Stripe.Striped.MaterialProvider",
    "title": "Stripe",
    "fields": [
      {
        "id": "TopY",
        "jsonKey": "TopY",
        "renderer": "Int",
        "label": "TopY",
        "requestedWidth": 50
      },
      {
        "id": "BottomY",
        "jsonKey": "BottomY",
        "renderer": "Int",
        "label": "BottomY",
        "requestedWidth": 50
      }
    ],
    "leftPins": [
      {
        "id": "OutputPin",
        "label": "",
        "type": "Stripe.Striped.MaterialProvider.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "Striped.MaterialProvider": {
    "nodeKind": "Striped.MaterialProvider",
    "title": "Striped MaterialProvider",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "OutputPin",
        "label": "",
        "type": "MaterialProvider.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "MaterialPin",
        "label": "Material",
        "type": "MaterialProvider.Connection",
        "multiple": false
      },
      {
        "id": "StripesPin",
        "label": "Stripes",
        "type": "Stripe.Striped.MaterialProvider.Connection",
        "multiple": true
      }
    ]
  },
  "Subtracter.VectorProvider": {
    "nodeKind": "Subtracter.VectorProvider",
    "title": "Subtracter VectorProvider",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "VectorProvider.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Minuend",
        "label": "Minuend",
        "type": "VectorProvider.Connection",
        "multiple": false
      },
      {
        "id": "Subtrahend",
        "label": "Subtrahend",
        "type": "VectorProvider.Connection",
        "multiple": false
      }
    ]
  },
  "Sum.Curve": {
    "nodeKind": "Sum.Curve",
    "title": "Sum Curve",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      }
    ],
    "leftPins": [
      {
        "id": "Input",
        "label": "",
        "type": "Curve.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Curves",
        "label": "Curves",
        "type": "Curve.Connection",
        "multiple": true
      }
    ]
  },
  "Sum.Density": {
    "nodeKind": "Sum.Density",
    "title": "Sum Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "DensityInputs",
        "label": "Inputs",
        "type": "Density.Connection",
        "multiple": true
      }
    ]
  },
  "Surface.Pattern": {
    "nodeKind": "Surface.Pattern",
    "title": "Surface Pattern",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "SurfaceRadius",
        "jsonKey": "SurfaceRadius",
        "renderer": "Float",
        "label": "SurfaceRadius"
      },
      {
        "id": "MediumRadius",
        "jsonKey": "MediumRadius",
        "renderer": "Float",
        "label": "MediumRadius"
      },
      {
        "id": "SurfaceGap",
        "jsonKey": "SurfaceGap",
        "renderer": "Int",
        "label": "SurfaceGap"
      },
      {
        "id": "MediumGap",
        "jsonKey": "MediumGap",
        "renderer": "Int",
        "label": "MediumGap"
      },
      {
        "id": "Facings",
        "jsonKey": "Facings",
        "renderer": "List",
        "label": "Facings",
        "requestedWidth": 40,
        "itemType": "String"
      },
      {
        "id": "RequireAllFacings",
        "jsonKey": "RequireAllFacings",
        "renderer": "Checkbox",
        "label": "RequireAllFacings"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Pattern.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Surface",
        "label": "Surface",
        "type": "Pattern.Connection",
        "multiple": false
      },
      {
        "id": "Medium",
        "label": "Medium",
        "type": "Pattern.Connection",
        "multiple": false
      }
    ]
  },
  "Switch.Density": {
    "nodeKind": "Switch.Density",
    "title": "Switch Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "SwitchCases",
        "label": "SwitchCases",
        "type": "Case.Switch.Density.Connection",
        "multiple": true
      }
    ]
  },
  "SwitchState.Density": {
    "nodeKind": "SwitchState.Density",
    "title": "SwitchState Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "SwitchState_",
        "jsonKey": "SwitchState_",
        "renderer": "SmallString",
        "label": "SwitchState",
        "requestedWidth": 250
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "DensityInputs",
        "label": "Inputs",
        "type": "Density.Connection",
        "multiple": true
      }
    ]
  },
  "Terrain.Biome": {
    "nodeKind": "Terrain.Biome",
    "title": "Terrain",
    "fields": [],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Terrain.Biome.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Density",
        "label": "Density",
        "type": "Density.Connection",
        "multiple": false
      }
    ]
  },
  "Terrain.Density": {
    "nodeKind": "Terrain.Density",
    "title": "Terrain Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "Transparent.MaterialProvider": {
    "nodeKind": "Transparent.MaterialProvider",
    "title": "Transparent MaterialProvider",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      }
    ],
    "leftPins": [
      {
        "id": "OutputPin",
        "label": "",
        "type": "MaterialProvider.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "TriangularGrid2d.Positions": {
    "nodeKind": "TriangularGrid2d.Positions",
    "title": "TriangularGrid2d Positions",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Positions.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "Trig.Density": {
    "nodeKind": "Trig.Density",
    "title": "Trig Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "Function",
        "jsonKey": "Function",
        "renderer": "Enum",
        "label": "Function",
        "requestedWidth": 150
      },
      {
        "id": "InputScale",
        "jsonKey": "InputScale",
        "renderer": "Float",
        "label": "InputScale",
        "requestedWidth": 100
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "DensityInputs",
        "label": "Inputs",
        "type": "Density.Connection",
        "multiple": true
      }
    ]
  },
  "Union.Positions": {
    "nodeKind": "Union.Positions",
    "title": "Union Positions",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Positions.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Positions.Connection",
        "label": "Positions",
        "type": "Positions.Connection",
        "multiple": true
      }
    ]
  },
  "Union.Prop": {
    "nodeKind": "Union.Prop",
    "title": "Union Prop",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Prop.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Props",
        "label": "Props",
        "type": "Prop.Connection",
        "multiple": true
      }
    ]
  },
  "Union.PropDistribution": {
    "nodeKind": "Union.PropDistribution",
    "title": "Union PropDistribution",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "OutputPin",
        "label": "",
        "type": "PropDistribution.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "PropDistributions",
        "label": "PropDistributions",
        "type": "PropDistribution.Connection",
        "multiple": true
      }
    ]
  },
  "VectorOffset.Positions": {
    "nodeKind": "VectorOffset.Positions",
    "title": "VectorOffset Positions",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Positions.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Positions.Connection",
        "label": "Positions",
        "type": "Positions.Connection",
        "multiple": false
      },
      {
        "id": "VectorProvider",
        "label": "VectorProvider",
        "type": "VectorProvider.Connection",
        "multiple": false
      },
      {
        "id": "MovementBounds",
        "label": "MovementBounds",
        "type": "Decimal.Bounds3d.Connection",
        "multiple": false
      }
    ]
  },
  "VectorProjector.VectorProvider": {
    "nodeKind": "VectorProjector.VectorProvider",
    "title": "VectorProjector VectorProvider",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "VectorProvider.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Source",
        "label": "Source",
        "type": "VectorProvider.Connection",
        "multiple": false
      },
      {
        "id": "Target",
        "label": "Target",
        "type": "VectorProvider.Connection",
        "multiple": false
      }
    ]
  },
  "VectorWarp.Density": {
    "nodeKind": "VectorWarp.Density",
    "title": "VectorWarp Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "WarpFactor",
        "jsonKey": "WarpFactor",
        "renderer": "Float",
        "label": "WarpFactor",
        "requestedWidth": 70
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "DensityInputs",
        "label": "Inputs",
        "type": "Density.Connection",
        "multiple": true
      },
      {
        "id": "WarpVector",
        "label": "WarpVector",
        "type": "Decimal.Vector3d.Connection",
        "multiple": false
      }
    ]
  },
  "Wall.Pattern": {
    "nodeKind": "Wall.Pattern",
    "title": "Wall Pattern",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "Directions",
        "jsonKey": "Directions",
        "renderer": "List",
        "label": "Directions",
        "requestedWidth": 40,
        "itemType": "String"
      },
      {
        "id": "RequireAllDirections",
        "jsonKey": "RequireAllDirections",
        "renderer": "Checkbox",
        "label": "RequireAllDirections"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Pattern.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Wall",
        "label": "Wall",
        "type": "Pattern.Connection",
        "multiple": false
      },
      {
        "id": "Origin",
        "label": "Origin",
        "type": "Pattern.Connection",
        "multiple": false
      }
    ]
  },
  "Weight.Weighted.Assignments": {
    "nodeKind": "Weight.Weighted.Assignments",
    "title": "Weight",
    "fields": [
      {
        "id": "Weight",
        "jsonKey": "Weight",
        "renderer": "Float",
        "label": "Weight",
        "requestedWidth": 70
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Weight.Weighted.Assignments.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Assignments",
        "label": "Assignments",
        "type": "Assignments.Connection",
        "multiple": false
      }
    ]
  },
  "Weighted.Assignments": {
    "nodeKind": "Weighted.Assignments",
    "title": "Weighted Assignments",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "SkipChance",
        "jsonKey": "SkipChance",
        "renderer": "Float",
        "label": "SkipChance",
        "requestedWidth": 70
      },
      {
        "id": "Seed",
        "jsonKey": "Seed",
        "renderer": "SmallString",
        "label": "Seed",
        "requestedWidth": 350
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Assignments.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "WeightedAssignments.Pin",
        "label": "WeightedAssignments",
        "type": "Weight.Weighted.Assignments.Connection",
        "multiple": true
      }
    ]
  },
  "Weighted.Cluster.Prop": {
    "nodeKind": "Weighted.Cluster.Prop",
    "title": "Weight",
    "fields": [
      {
        "id": "Weight",
        "jsonKey": "Weight",
        "renderer": "Float",
        "label": "Weight",
        "requestedWidth": 50
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Weighted.Cluster.Prop.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "ColumnProp",
        "label": "ColumnProp",
        "type": "Column.Prop.Connection",
        "multiple": false
      }
    ]
  },
  "Weighted.ContentSupplier": {
    "nodeKind": "Weighted.ContentSupplier",
    "title": "[DEV] Weighted ContentSupplier",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "Seed",
        "jsonKey": "Seed",
        "renderer": "SmallString",
        "label": "Seed",
        "requestedWidth": 350
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "ContentSupplier.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Entries",
        "label": "Entries",
        "type": "Entry.Weighted.ContentSupplier.Connection",
        "multiple": true
      }
    ]
  },
  "Weighted.MaterialProvider": {
    "nodeKind": "Weighted.MaterialProvider",
    "title": "Weighted MaterialProvider",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "Seed",
        "jsonKey": "Seed",
        "renderer": "SmallString",
        "label": "Seed",
        "requestedWidth": 350
      },
      {
        "id": "SkipChance",
        "jsonKey": "SkipChance",
        "renderer": "Float",
        "label": "SkipChance",
        "requestedWidth": 100
      }
    ],
    "leftPins": [
      {
        "id": "OutputPin",
        "label": "",
        "type": "MaterialProvider.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "WeightedMaterialsPin",
        "label": "WeightedMaterials",
        "type": "Entry.Weighted.MaterialProvider.Connection",
        "multiple": true
      }
    ]
  },
  "Weighted.NodeAction": {
    "nodeKind": "Weighted.NodeAction",
    "title": "[DEV] Weighted NodeAction",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "Seed",
        "jsonKey": "Seed",
        "renderer": "SmallString",
        "label": "Seed",
        "requestedWidth": 350
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "NodeAction.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Entries",
        "label": "Entries",
        "type": "Entry.Weighted.NodeAction.Connection",
        "multiple": true
      }
    ]
  },
  "Weighted.Prop": {
    "nodeKind": "Weighted.Prop",
    "title": "Weighted Prop",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "Seed",
        "jsonKey": "Seed",
        "renderer": "SmallString",
        "label": "Seed",
        "requestedWidth": 350
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "Prop.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "Entries",
        "label": "Entries",
        "type": "Entry.Weighted.Prop.Connection",
        "multiple": true
      }
    ]
  },
  "WeightedPath.Prefab.Prop": {
    "nodeKind": "WeightedPath.Prefab.Prop",
    "title": "Weighted Path",
    "fields": [
      {
        "id": "Path",
        "jsonKey": "Path",
        "renderer": "SmallString",
        "label": "Path",
        "requestedWidth": 700
      },
      {
        "id": "Weight",
        "jsonKey": "Weight",
        "renderer": "Float",
        "label": "Weight"
      }
    ],
    "leftPins": [
      {
        "id": "Output",
        "label": "",
        "type": "WeightedPath.Prefab.Prop.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "WeightedThickness.Layer.SpaceAndDepth.MaterialProvider": {
    "nodeKind": "WeightedThickness.Layer.SpaceAndDepth.MaterialProvider",
    "title": "WeightedThickness Layer SADMP",
    "fields": [
      {
        "id": "Seed",
        "jsonKey": "Seed",
        "renderer": "SmallString",
        "label": "Seed",
        "requestedWidth": 350
      }
    ],
    "leftPins": [
      {
        "id": "OutputPin",
        "label": "",
        "type": "Layer.SpaceAndDepth.MaterialProvider.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "MaterialPin",
        "label": "Material",
        "type": "MaterialProvider.Connection",
        "multiple": false
      },
      {
        "id": "ThicknessesPin",
        "label": "Thicknesses",
        "type": "Thickness.Layer.SpaceAndDepth.MaterialProvider.Connection",
        "multiple": true
      }
    ]
  },
  "WhiteNoise.Density": {
    "nodeKind": "WhiteNoise.Density",
    "title": "WhiteNoise Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "Seed",
        "jsonKey": "Seed",
        "renderer": "SmallString",
        "label": "Seed",
        "requestedWidth": 350
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "Xor.Density": {
    "nodeKind": "Xor.Density",
    "title": "Xor Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "DensityInputs",
        "label": "Inputs",
        "type": "Density.Connection",
        "multiple": true
      }
    ]
  },
  "XOverride.Density": {
    "nodeKind": "XOverride.Density",
    "title": "XOverride Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "Value",
        "jsonKey": "Value",
        "renderer": "Float",
        "label": "Value",
        "requestedWidth": 100
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "DensityInputs",
        "label": "Inputs",
        "type": "Density.Connection",
        "multiple": true
      }
    ]
  },
  "XValue.Density": {
    "nodeKind": "XValue.Density",
    "title": "XValue Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "YOverride.Density": {
    "nodeKind": "YOverride.Density",
    "title": "YOverride Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "Value",
        "jsonKey": "Value",
        "renderer": "Float",
        "label": "Value",
        "requestedWidth": 100
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "DensityInputs",
        "label": "Inputs",
        "type": "Density.Connection",
        "multiple": true
      }
    ]
  },
  "YSampled.Density": {
    "nodeKind": "YSampled.Density",
    "title": "YSampled Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "SampleDistance",
        "jsonKey": "SampleDistance",
        "renderer": "Float",
        "label": "SampleDistance"
      },
      {
        "id": "SampleOffset",
        "jsonKey": "SampleOffset",
        "renderer": "Float",
        "label": "SampleOffset"
      },
      {
        "id": "Interpolate",
        "jsonKey": "Interpolate",
        "renderer": "Checkbox",
        "label": "Interpolate"
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "DensityInputs",
        "label": "Input",
        "type": "Density.Connection",
        "multiple": true
      }
    ]
  },
  "YValue.Density": {
    "nodeKind": "YValue.Density",
    "title": "YValue Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  },
  "ZOverride.Density": {
    "nodeKind": "ZOverride.Density",
    "title": "ZOverride Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      },
      {
        "id": "Value",
        "jsonKey": "Value",
        "renderer": "Float",
        "label": "Value",
        "requestedWidth": 100
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": [
      {
        "id": "DensityInputs",
        "label": "Inputs",
        "type": "Density.Connection",
        "multiple": true
      }
    ]
  },
  "ZValue.Density": {
    "nodeKind": "ZValue.Density",
    "title": "ZValue Density",
    "fields": [
      {
        "id": "ExportAs",
        "jsonKey": "ExportAs",
        "renderer": "SmallString",
        "label": "ExportAs",
        "requestedWidth": 250
      },
      {
        "id": "Skip",
        "jsonKey": "Skip",
        "renderer": "Checkbox",
        "label": "Skip"
      }
    ],
    "leftPins": [
      {
        "id": "DensityOutput",
        "label": "",
        "type": "Density.Connection",
        "multiple": false
      }
    ],
    "rightPins": []
  }
};

export const HYTALE_GENERATOR_JAVA_VISUAL_CATALOG_INFO = {
  source: 'HytaleGenerator Java',
  nodeTypeCount: 341,
} as const;
