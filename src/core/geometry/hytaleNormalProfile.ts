/**
 * Geometry constants derived from the shipped NodeEditor Noesis XAML in normal mode.
 * They describe rendering only. Layout strategies must not live here.
 */
export const HYTALE_NORMAL_GEOMETRY_PROFILE = {
  id: 'hytale-normal-noesis',
  node: {
    outerBorder: 3,
    headerPaddingX: 6,
    headerPaddingY: 4,
    titleRowBottomMargin: 3,
    headerActionHeight: 25,
    headerActionWidth: 30,
    bodyBorderX: 3,
    bodyBorderBottom: 3,
    bodyMarginY: 6,
    contentPaddingX: 16,
  },
  field: {
    standardHeight: 30,
    standardMarginY: 4,
    standardMarginX: 4,
    labelColumnWidth: 200,
    checkboxControlWidth: 100,
    defaultControlWidth: 100,
    sliderHeight: 20,
    sliderMarginY: 2,
    sliderGapX: 4,
    listOuterTop: 15,
    listOuterBottom: 10,
    listGroupPaddingY: 10,
    listHeaderEstimate: 22,
    listItemEstimate: 49,
    listAddButtonEstimate: 49,
    tagMapFallbackHeight: 160,
  },
  pin: {
    connectorHeight: 30,
    marginY: 4,
    connectorWidth: 20,
    contentGap: 5,
  },
  text: {
    averageGlyphWidth: 7.6,
    titleAverageGlyphWidth: 8.0,
    lineHeight: 20,
  },
  fallback: {
    width: 420,
    height: 180,
  },
} as const;
