import {
  BusinessWasteEntry,
  EcoPointEvent,
  EmissionFactorRow,
  MapFacility,
  OfficialChannelResource,
  SavedScanRecord,
  ScrapRateRow,
  ShoutOutPost,
  WasteScanResult,
} from '../types/waste';

export interface EcoTipItem {
  id: string;
  title: string;
  tip: string;
  category: string;
  source: 'Built-in Curated Guide' | 'AI-Generated (Gemini)';
}

export interface SustainabilityQuote {
  id: string;
  quote: string;
  attribution: string;
  context: string;
}

export const BUILT_IN_ECO_TIPS: EcoTipItem[] = [
  {
    id: 'tip-1',
    title: 'Tape Battery Terminals Before E-Waste Drop-Off',
    tip: 'Before taking lithium-ion or button-cell batteries to a collection point, cover the metal terminals with clear non-conductive tape to prevent short-circuit sparks against other metals.',
    category: 'Battery Safety',
    source: 'Built-in Curated Guide',
  },
  {
    id: 'tip-2',
    title: 'Rinse & Dry Food Containers to Protect Paper Batches',
    tip: 'Leftover oil or liquid inside plastic and glass containers can contaminate entire bales of paper and cardboard in mixed collection streams. A quick rinse and shake keeps materials recoverable.',
    category: 'Contamination Prevention',
    source: 'Built-in Curated Guide',
  },
  {
    id: 'tip-3',
    title: 'Wipe Personal Data Before Recycling Devices',
    tip: 'Perform a factory reset and remove SIM and SD cards from old phones or laptops before handing them over to an e-waste collection center or refurbisher.',
    category: 'E-Waste Prep',
    source: 'Built-in Curated Guide',
  },
  {
    id: 'tip-4',
    title: 'Keep Power Cords Bundled With Appliances',
    tip: 'Instead of snipping cables off working or repairable small appliances, coil and tie them together so repair technicians or second-hand users can test the item immediately.',
    category: 'Repair & Reuse',
    source: 'Built-in Curated Guide',
  },
  {
    id: 'tip-5',
    title: 'Separate Corrugated Cardboard From Soiled Pizza Bases',
    tip: 'Tear off the clean top lid of a pizza box for clean paper recycling and compost or discard the grease-soaked bottom half separately.',
    category: 'Paper Recovery',
    source: 'Built-in Curated Guide',
  },
];

export const BUILT_IN_QUOTES: SustainabilityQuote[] = [
  {
    id: 'q-1',
    quote: 'The greatest threat to our planet is the belief that someone else will save it.',
    attribution: 'Robert Swan',
    context: 'Polar explorer and environmental educator',
  },
  {
    id: 'q-2',
    quote: 'We do not inherit the earth from our ancestors; we borrow it from our children.',
    attribution: 'Traditional Proverb',
    context: 'Widely cited conservation principle',
  },
  {
    id: 'q-3',
    quote: 'In nature, nothing exists alone.',
    attribution: 'Rachel Carson',
    context: 'Silent Spring (1962)',
  },
  {
    id: 'q-4',
    quote: 'There is no such thing as "away". When we throw anything away, it must go somewhere.',
    attribution: 'Annie Leonard',
    context: 'Author of The Story of Stuff',
  },
  {
    id: 'q-5',
    quote: 'Every repair extends the story of the materials we have already extracted.',
    attribution: 'EcoLoop Circularity Principle',
    context: 'Original EcoLoop motto',
  },
];

export const DEFAULT_EMISSION_FACTORS: EmissionFactorRow[] = [
  {
    id: 'ef-aluminum',
    category: 'metal',
    materialLabel: 'Aluminum & Mixed Metals',
    factorKgCO2ePerKg: 8.1,
    source: 'UK DESNZ / DEFRA GHG Conversion Factors (Closed-loop metal recycling reference)',
    assumptions:
      'Assumes clean sorted scrap metal replacing primary virgin smelting; actual savings depend on local smelter electricity grid mix and transport distance.',
  },
  {
    id: 'ef-plastic',
    category: 'plastic',
    materialLabel: 'Rigid Plastics (PET / HDPE)',
    factorKgCO2ePerKg: 1.4,
    source: 'US EPA WARM Model v16 (Recycled vs. Landfilled PET/HDPE reference)',
    assumptions:
      'Assumes clean, uncontaminated rigid plastic sorted mechanically. Multi-layer flexible films or heavily soiled plastics cannot achieve this factor.',
  },
  {
    id: 'ef-paper',
    category: 'paper',
    materialLabel: 'Corrugated Cardboard & Clean Paper',
    factorKgCO2ePerKg: 0.9,
    source: 'DEFRA / IPCC Waste Sector Reference Factors (Paper & Board recovery)',
    assumptions:
      'Assumes dry, unsoiled fiber diverted from anaerobic landfill decomposition and re-pulped.',
  },
  {
    id: 'ef-glass',
    category: 'glass',
    materialLabel: 'Container Cullet Glass',
    factorKgCO2ePerKg: 0.31,
    source: 'US EPA WARM / FEVE Glass Remelting Reference',
    assumptions:
      'Assumes color-sorted container glass remelted in furnace cullet batch; excludes heat-resistant borosilicate or mirror glass.',
  },
  {
    id: 'ef-ewaste',
    category: 'e-waste',
    materialLabel: 'Small Consumer Electronics & Circuitry',
    factorKgCO2ePerKg: 1.85,
    source: 'UN Global E-Waste Monitor / WEEE Material Recovery Reference',
    assumptions:
      'Represents approximate recovery of copper, aluminum, and steel fractions through formal dismantling. Direct reuse or repair saves significantly more embodied carbon than smelting.',
  },
  {
    id: 'ef-battery',
    category: 'battery',
    materialLabel: 'Lithium-Ion & Rechargeable Cells',
    factorKgCO2ePerKg: 1.2,
    source: 'Argonne National Laboratory EverBatt Hydrometallurgical Recovery Reference',
    assumptions:
      'Primary benefit is preventing toxic soil/water leaching and landfill fires rather than bulk mass CO2e offset.',
  },
  {
    id: 'ef-textile',
    category: 'textile',
    materialLabel: 'Cotton & Synthetic Apparel (Reuse/Fiber Recovery)',
    factorKgCO2ePerKg: 2.1,
    source: 'WRAP UK Valuing Our Clothes Reference',
    assumptions:
      'Assumes clean dry textiles diverted to mechanical fiber shredding or direct garment reuse.',
  },
  {
    id: 'ef-appliance',
    category: 'appliance',
    materialLabel: 'Household Small Appliances',
    factorKgCO2ePerKg: 1.6,
    source: 'WEEE Forum Material Recovery Average',
    assumptions:
      'Assumes safe depollution and recovery of ferrous/non-ferrous metal housing and copper motor windings.',
  },
  {
    id: 'ef-organic',
    category: 'organic',
    materialLabel: 'Food & Garden Organics (Aerobic Composting)',
    factorKgCO2ePerKg: 0.45,
    source: 'IPCC / EPA Aerobic Composting vs. Uncaptured Landfill Methane Reference',
    assumptions:
      'Assumes proper aerated composting that avoids anaerobic methane generation.',
  },
  {
    id: 'ef-hazardous',
    category: 'hazardous',
    materialLabel: 'Hazardous Chemical / Medical / E-Waste Components',
    factorKgCO2ePerKg: null,
    source: 'Insufficient standardized net CO2e factor — safety & toxicity containment is primary metric',
    assumptions:
      'Hazardous items require specialized neutralization or containment; carbon offset calculation is not applicable.',
  },
  {
    id: 'ef-mixed',
    category: 'mixed',
    materialLabel: 'Mixed / Composite Unseparated Items',
    factorKgCO2ePerKg: null,
    source: 'Insufficient data for unseparated composite materials',
    assumptions:
      'Cannot estimate emissions savings reliably without separating constituent materials.',
  },
  {
    id: 'ef-other',
    category: 'other',
    materialLabel: 'Other Unclassified Items',
    factorKgCO2ePerKg: null,
    source: 'Insufficient data for unclassified category',
    assumptions: 'No reliable emission factor exists for unclassified items.',
  },
];

export const DEFAULT_SCRAP_RATES: ScrapRateRow[] = [
  {
    id: 'sr-paper',
    category: 'paper',
    materialLabel: 'Corrugated Cardboard & Old Newspaper',
    rateInrPerKg: 14,
    notes: 'Must be dry, bundled, and free of food grease or plastic lamination.',
  },
  {
    id: 'sr-plastic',
    category: 'plastic',
    materialLabel: 'Clean PET Bottles & Rigid HDPE Containers',
    rateInrPerKg: 18,
    notes: 'Multi-layer snack wrappers and thin carry bags typically fetch ₹0/kg.',
  },
  {
    id: 'sr-metal',
    category: 'metal',
    materialLabel: 'Iron / Steel Tin & Aluminum Cans (Mixed Average)',
    rateInrPerKg: 42,
    notes: 'Pure aluminum or copper fetches higher rates; mixed tin/iron is lower.',
  },
  {
    id: 'sr-ewaste',
    category: 'e-waste',
    materialLabel: 'Discarded Small Electronics, Cables & PCBs',
    rateInrPerKg: 55,
    notes: 'Hand over only to formal e-waste collection channels to prevent toxic backyard acid-leaching.',
  },
  {
    id: 'sr-appliance',
    category: 'appliance',
    materialLabel: 'Non-Working Small Household Appliances',
    rateInrPerKg: 35,
    notes: 'Value depends on intact motor windings and metal casing weight.',
  },
  {
    id: 'sr-glass',
    category: 'glass',
    materialLabel: 'Intact Glass Bottles & Cullet',
    rateInrPerKg: 3,
    notes: 'Many collectors accept intact standard bottles per piece or at nominal weight value.',
  },
  {
    id: 'sr-battery',
    category: 'battery',
    materialLabel: 'Household & Lithium-Ion Batteries',
    rateInrPerKg: 0,
    notes: 'Small lithium-ion cells are a safe-disposal priority, not a cash-scrap commodity for households.',
  },
  {
    id: 'sr-textile',
    category: 'textile',
    materialLabel: 'Clean Cotton & Wearable Textiles',
    rateInrPerKg: 5,
    notes: 'Donation or thrift reuse is strongly preferred over rag-shredding weight value.',
  },
];

export const DEFAULT_OFFICIAL_CHANNELS: OfficialChannelResource[] = [
  {
    id: 'oc-1',
    title: 'Check Your City Municipal Corporation Solid Waste Portal',
    organizationType: 'Municipal',
    description:
      'Local urban bodies (ULBs) operate dry-waste collection centers (DWCCs) and periodic e-waste/hazardous collection drives. Look up your ward sanitation schedule on your municipal corporation website.',
    actionHint: 'Placeholder: Add your city municipal helpline or official ward URL here.',
    isPlaceholder: true,
  },
  {
    id: 'oc-2',
    title: 'Central & State Pollution Control Board (CPCB / SPCB) E-Waste Directories',
    organizationType: 'Pollution Control Board',
    description:
      'State Pollution Control Boards publish public lists of registered e-waste dismantlers, PROs (Producer Responsibility Organizations), and collection centers under E-Waste (Management) Rules.',
    actionHint: 'Placeholder: Link your State Pollution Control Board public directory.',
    isPlaceholder: true,
  },
  {
    id: 'oc-3',
    title: 'National Cleanliness & Citizen Civic Reporting Portals',
    organizationType: 'National Portal',
    description:
      'Use official civic sanitation portals or your city’s official citizen grievance app to report illegal e-waste dumping or request bulk dry-waste collection.',
    actionHint: 'Placeholder: Verify and enter your region’s official civic portal.',
    isPlaceholder: true,
  },
  {
    id: 'oc-4',
    title: 'Original Equipment Manufacturer (OEM) Take-Back Programs',
    organizationType: 'Manufacturer Take-Back',
    description:
      'Under Extended Producer Responsibility (EPR), major smartphone, laptop, battery, and appliance manufacturers maintain official drop-off points at their service centers for end-of-life products.',
    actionHint: 'Check the "Sustainability / E-Waste Recycling" footer link on your device brand’s official website.',
    isPlaceholder: false,
  },
];

export const DEMO_SCAN_ITEMS: Record<string, WasteScanResult> = {
  battery_pack: {
    itemName: 'Swollen Lithium-Ion Power Bank / Smartphone Battery Pack',
    category: 'battery',
    visibleObservations: [
      'Rectangular portable battery pack / pouch cell casing with visible slight bulging along the center seam.',
      'USB charging ports and polymer outer shell visible.',
    ],
    assumedCharacteristics: [
      'Assumed lithium-cobalt-oxide (LCO) or lithium-polymer internal cell chemistry typical of consumer power banks.',
      'Assumed internal electrolyte gas build-up causing casing expansion.',
    ],
    materialEstimates: [
      { material: 'Lithium-Ion Cell Assembly (Graphite, Cathode Oxides, Electrolyte)', estimatedPercentage: 65, confidence: 'medium', isAssumed: true },
      { material: 'ABS / Polycarbonate Outer Housing', estimatedPercentage: 20, confidence: 'high', isAssumed: true },
      { material: 'Copper & Aluminum Current Collectors / PCB', estimatedPercentage: 15, confidence: 'medium', isAssumed: true },
    ],
    recyclability: {
      score: 70,
      explanation:
        'AI Estimate (Not an Official Rating): Cobalt, lithium, copper, and aluminum inside lithium-ion cells are recoverable at specialized hydrometallurgical battery recycling facilities, but NEVER in household recycling bins.',
    },
    hazards: [
      {
        hazard: 'Thermal Runaway & Fire / Explosion Risk (Lithium-Ion)',
        severity: 'high',
        precaution:
          'CRITICAL SAFETY WARNING: Do NOT puncture, crush, open, bend, drop, or attempt to charge this battery. If it is hot, swollen, smoking, hissing, or leaking, place it on a non-flammable surface (such as sand, concrete, or ceramic) away from flammable objects, ventilate the area, and seek professional hazardous waste guidance.',
      },
      {
        hazard: 'Corrosive & Toxic Electrolyte Leakage',
        severity: 'high',
        precaution:
          'Never dismantle the battery casing. Tape the metal terminals/ports with clear non-conductive tape before transporting to a designated battery/e-waste collection point.',
      },
    ],
    recommendedActions: [
      {
        action: 'special_disposal',
        title: 'Isolate Safely & Take to Designated Battery / E-Waste Drop-Off',
        instructions: [
          'Unplug immediately and never attempt to recharge or power on a swollen battery pack.',
          'Cover the charging ports or exposed metal contacts with clear non-conductive tape.',
          'Store temporarily in a cool, dry, non-flammable container away from sunlight and combustibles.',
          'Deliver in person to an e-waste or hazardous battery collection center (never place in curbside bins, as garbage truck compactors crush batteries and cause fires).',
        ],
      },
    ],
    bestUse: {
      action: 'special_disposal',
      headline: 'Immediate Safe Isolation & Specialized Battery Drop-Off',
      why: 'Swollen or end-of-life lithium-ion batteries pose a severe fire hazard and must never be reused, repaired, or placed in regular bins.',
    },
    reuseIdeas: [],
    uncertainties: [
      'Internal state-of-charge and cell separator integrity cannot be determined from visual inspection.',
      'Exact cathode chemistry (LCO, NMC, or LFP) is not visible externally.',
    ],
    estimatedWeightKg: 0.28,
  },
  ewaste_board: {
    itemName: 'Discarded Desktop Computer Motherboard & Cooling Fan',
    category: 'e-waste',
    visibleObservations: [
      'Printed circuit board (PCB) with integrated circuit slots, aluminum heatsink, and plastic cooling fan.',
      'Coin-cell CMOS battery socket visible on board.',
    ],
    assumedCharacteristics: [
      'Assumed FR-4 fiberglass-epoxy laminate substrate with copper traces and trace precious metals.',
      'Assumed CR2032 lithium coin battery present in the motherboard holder.',
    ],
    materialEstimates: [
      { material: 'FR-4 Fiberglass & Epoxy Resin Substrate', estimatedPercentage: 45, confidence: 'medium', isAssumed: true },
      { material: 'Aluminum Heatsink & Steel Brackets', estimatedPercentage: 30, confidence: 'high', isAssumed: true },
      { material: 'Copper Traces, Pins & Connectors', estimatedPercentage: 18, confidence: 'medium', isAssumed: true },
      { material: 'ABS Fan Shroud & Electronic IC Packages', estimatedPercentage: 7, confidence: 'medium', isAssumed: true },
    ],
    recyclability: {
      score: 78,
      explanation:
        'AI Estimate (Not an Official Rating): High recovery potential for aluminum heatsinks, copper traces, and gold/palladium contact pins when processed by formal e-waste recyclers.',
    },
    hazards: [
      {
        hazard: 'Button-Cell CMOS Battery & Lead Solder / Brominated Flame Retardants',
        severity: 'medium',
        precaution:
          'Do not burn, heat, or use acid to strip metals. Keep away from children (coin cells are a severe ingestion hazard). Never dismantle power capacitors.',
      },
    ],
    recommendedActions: [
      {
        action: 'repair',
        title: 'Test or Harvest Non-Hazardous Modular Parts (If Qualified)',
        instructions: [
          'If the cooling fan or aluminum heatsink is intact, it can be detached with a standard screwdriver for spare PC builds.',
          'Do not heat solder joints or crush chips.',
        ],
      },
      {
        action: 'special_disposal',
        title: 'Hand Over to Formal E-Waste Collection Center',
        instructions: [
          'Place the circuit board in an anti-static or cardboard box so sharp solder pins do not puncture bags.',
          'Deliver to a registered e-waste drop-off point or manufacturer collection center.',
        ],
      },
    ],
    bestUse: {
      action: 'special_disposal',
      headline: 'Formal E-Waste Material Recovery (After Salvaging Working Fan)',
      why: 'Formal e-waste smelters safely recover copper, aluminum, and trace precious metals without toxic open-air burning.',
    },
    reuseIdeas: [
      {
        idea: 'Reuse the 12V DC brushless cooling fan for a DIY desk ventilator or electronics enclosure.',
        difficulty: 'medium',
        estimatedTime: '15 mins',
        steps: [
          'Unplug the 3-pin or 4-pin fan header from the motherboard and unscrew the 4 corner mounting screws.',
          'Wipe dust off the fan blades with a dry brush or microfiber cloth.',
          'Connect to a standard 5V-12V USB step-up adapter for a quiet desk or solder-fume extractor fan.',
        ],
      },
      {
        idea: 'Detach the extruded aluminum heatsink block for passive cooling on Raspberry Pi or LED projects.',
        difficulty: 'easy',
        estimatedTime: '10 mins',
        steps: [
          'Release the spring clips or mounting screws holding the aluminum fin block.',
          'Clean old thermal paste off the base using isopropyl alcohol and a paper towel.',
          'Attach to DIY microcontroller or high-power LED modules using thermal tape.',
        ],
      },
    ],
    uncertainties: [
      'Whether the motherboard is electrically functional cannot be verified from a photo.',
      'Presence of leaded vs. RoHS lead-free solder depends on manufacturing year.',
    ],
    estimatedWeightKg: 0.65,
  },
  pet_bottle: {
    itemName: 'Clear PET Plastic Beverage Bottle (1 Liter)',
    category: 'plastic',
    visibleObservations: [
      'Transparent rigid plastic bottle with threaded neck and colored cap.',
      'Thin wrap-around film label around mid-section.',
    ],
    assumedCharacteristics: [
      'Assumed Polyethylene Terephthalate (PET #1) bottle body and HDPE (#2) or PP (#5) screw cap.',
      'Assumed free of hazardous chemical residue.',
    ],
    materialEstimates: [
      { material: 'PET (#1) Clear Bottle Body', estimatedPercentage: 88, confidence: 'high', isAssumed: true },
      { material: 'HDPE / PP Bottle Cap & Neck Ring', estimatedPercentage: 9, confidence: 'high', isAssumed: true },
      { material: 'BOPP / PVC Shrink Label Film', estimatedPercentage: 3, confidence: 'medium', isAssumed: true },
    ],
    recyclability: {
      score: 92,
      explanation:
        'AI Estimate (Not an Official Rating): Clear PET (#1) is one of the most widely recycled rigid plastics worldwide when empty, rinsed, and uncontaminated.',
    },
    hazards: [
      {
        hazard: 'Bacterial Growth or Microplastic Leaching if Reused Repeatedly for Hot Liquids',
        severity: 'low',
        precaution:
          'Single-use PET bottles are not designed for hot liquids or long-term repeated drinking reuse. Prefer non-food household reuse or clean dry-waste recycling.',
      },
    ],
    recommendedActions: [
      {
        action: 'recycle',
        title: 'Empty, Rinse, Crush & Place in Dry Recyclables',
        instructions: [
          'Empty all remaining liquid and give a quick water rinse.',
          'Remove the thin outer plastic wrapper if it peels off easily.',
          'Crush the bottle lengthwise to save collection volume and screw the cap back on so the cap is captured too.',
        ],
      },
      {
        action: 'reuse',
        title: 'Repurpose for Balcony Drip-Watering or Dry Bulk Storage Funnel',
        instructions: [
          'Wash thoroughly and let dry completely.',
          'Cut the top cone to use as a wide-mouth dry grain funnel, or poke micro-holes in the cap for slow balcony plant watering.',
        ],
      },
    ],
    bestUse: {
      action: 'recycle',
      headline: 'Clean Dry-Waste PET Recycling Stream',
      why: 'Clear PET bottles have high bottle-to-bottle and polyester-fiber mechanical recycling efficiency.',
    },
    reuseIdeas: [
      {
        idea: 'Self-watering planter spike for potted balcony herbs during weekend travel.',
        difficulty: 'easy',
        estimatedTime: '5 mins',
        steps: [
          'Rinse the bottle clean and peel off the outer plastic label.',
          'Carefully poke 2-3 tiny pinholes in the plastic cap using a thumbtack.',
          'Fill with water, screw the cap on, and invert the neck 4 cm deep into damp potting soil.',
        ],
      },
      {
        idea: 'Cut top section into a wide-mouth workshop funnel + bottom cup for sorting screws.',
        difficulty: 'easy',
        estimatedTime: '5 mins',
        steps: [
          'Wash and dry the bottle completely.',
          'Cut horizontally about 10 cm below the neck using scissors.',
          'Use the top cone as a dry soil/seed funnel and the sturdy bottom base as a hardware tray.',
        ],
      },
    ],
    uncertainties: [
      'Resin identification code (#1 PET vs. PVC/PLA lookalikes) should be verified on the bottle base.',
      'Internal residue or odor cannot be confirmed from a photograph.',
    ],
    estimatedWeightKg: 0.04,
  },
  cardboard_box: {
    itemName: 'Corrugated Cardboard Shipping Box',
    category: 'paper',
    visibleObservations: [
      'Brown fluted corrugated cardboard shipping carton with packing tape along the top flaps.',
    ],
    assumedCharacteristics: [
      'Assumed unbleached Kraft paperboard liner and fluted medium without wax coating.',
    ],
    materialEstimates: [
      { material: 'Corrugated Kraft Cellulose Fiber', estimatedPercentage: 95, confidence: 'high', isAssumed: true },
      { material: 'Acrylic/Polypropylene Packaging Tape & Shipping Label', estimatedPercentage: 5, confidence: 'high', isAssumed: true },
    ],
    recyclability: {
      score: 90,
      explanation:
        'AI Estimate (Not an Official Rating): Clean, dry corrugated cardboard is highly recyclable and in strong demand by paper mills and local scrap collectors.',
    },
    hazards: [
      {
        hazard: 'Staples or Box-Cutter Edges',
        severity: 'low',
        precaution: 'Check flaps for heavy metal staples before flattening by hand.',
      },
    ],
    recommendedActions: [
      {
        action: 'reuse',
        title: 'Flatten & Reuse for Storage, Moving, or E-Waste Drop-Off Packing',
        instructions: [
          'Slit the tape cleanly along the seam so the flaps remain intact.',
          'Store flat in a dry corner for future shipping, closet organization, or carrying e-waste safely.',
        ],
      },
      {
        action: 'recycle',
        title: 'Remove Excess Plastic Tape & Bundle for Dry Paper Recycling',
        instructions: [
          'Peel off loose plastic tape strips and bubble-wrap inserts.',
          'Flatten completely and keep dry until dry-waste collection or scrap dealer pickup.',
        ],
      },
    ],
    bestUse: {
      action: 'reuse',
      headline: 'Direct Reuse for Storage or Shipping Before Final Paper Recycling',
      why: 'Reusing an intact box once or twice saves 100% of re-pulping energy before the fibers are eventually recycled.',
    },
    reuseIdeas: [
      {
        idea: 'Sheet-mulch weed barrier under garden compost or raised beds (after removing all tape and labels).',
        difficulty: 'easy',
        estimatedTime: '10 mins',
        steps: [
          'Peel off all plastic packing tape, shipping stickers, and any metal staples.',
          'Lay the flattened cardboard sheets over weeds in your garden bed, overlapping edges by 10 cm.',
          'Soak thoroughly with water and cover with 5 cm of compost or mulch.',
        ],
      },
      {
        idea: 'Custom drawer divider inserts cut to size for charging cables, stationery, or tools.',
        difficulty: 'easy',
        estimatedTime: '15 mins',
        steps: [
          'Measure the interior length, width, and height of your desk or dresser drawer.',
          'Cut the side panels of the box into long strips matching your drawer height.',
          'Cut halfway notches every 8-10 cm and slot the strips together into a neat grid.',
        ],
      },
    ],
    uncertainties: [
      'Interior grease, moisture, or chemical stains are not visible from the exterior view.',
    ],
    estimatedWeightKg: 0.35,
  },
};

export const DEMO_FACILITIES: MapFacility[] = [
  {
    id: 'demo-fac-1',
    name: 'Econom Sample E-Waste Collection Point (North Zone)',
    type: 'E-Waste Center',
    address: 'Demo location - not verified (No real street address or phone number)',
    lat: 12.9784,
    lon: 77.599,
    distanceKm: 1.4,
    source: 'Demo location - not verified',
    isDemo: true,
    acceptedCategories: ['e-waste', 'battery', 'appliance'],
  },
  {
    id: 'demo-fac-2',
    name: 'Sample Dry Waste Recovery Center (Central Ward)',
    type: 'Municipal Drop-off',
    address: 'Demo location - not verified (No real street address or phone number)',
    lat: 12.9665,
    lon: 77.587,
    distanceKm: 2.1,
    source: 'Demo location - not verified',
    isDemo: true,
    acceptedCategories: ['plastic', 'paper', 'glass', 'metal', 'textile'],
  },
  {
    id: 'demo-fac-3',
    name: 'Sample Material Recovery & Scrap Aggregator (East Hub)',
    type: 'Scrap Dealer',
    address: 'Demo location - not verified (No real street address or phone number)',
    lat: 12.9719,
    lon: 77.618,
    distanceKm: 3.3,
    source: 'Demo location - not verified',
    isDemo: true,
    acceptedCategories: ['paper', 'metal', 'plastic', 'appliance'],
  },
  {
    id: 'demo-fac-4',
    name: 'Sample Hazardous & Battery Safe Drop Point (South Hub)',
    type: 'Recycling Center',
    address: 'Demo location - not verified (No real street address or phone number)',
    lat: 12.952,
    lon: 77.594,
    distanceKm: 3.8,
    source: 'Demo location - not verified',
    isDemo: true,
    acceptedCategories: ['battery', 'hazardous', 'e-waste'],
  },
];

export const DEMO_SCAN_HISTORY: SavedScanRecord[] = [
  {
    id: 'demo-scan-1',
    timestamp: new Date(Date.now() - 86400000 * 3).toISOString(),
    inputType: 'demo',
    isDemo: true,
    result: DEMO_SCAN_ITEMS.battery_pack,
    userWeightKg: 0.28,
    completedActionType: 'special_disposal',
    completedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    completedOptions: ['disposal'],
  },
  {
    id: 'demo-scan-2',
    timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
    inputType: 'demo',
    isDemo: true,
    result: DEMO_SCAN_ITEMS.ewaste_board,
    userWeightKg: 0.65,
    completedActionType: 'repair',
    completedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    completedOptions: ['reuse'],
  },
  {
    id: 'demo-scan-3',
    timestamp: new Date(Date.now() - 86400000 * 1).toISOString(),
    inputType: 'demo',
    isDemo: true,
    result: DEMO_SCAN_ITEMS.cardboard_box,
    userWeightKg: 1.2,
    completedActionType: 'reuse',
    completedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    completedOptions: ['reuse'],
  },
  {
    id: 'demo-scan-4',
    timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
    inputType: 'demo',
    isDemo: true,
    result: DEMO_SCAN_ITEMS.pet_bottle,
    userWeightKg: 0.2,
    completedActionType: null,
    completedAt: null,
    completedOptions: [],
  },
];

export const DEMO_POINT_EVENTS: EcoPointEvent[] = [
  {
    id: 'demo-pt-1',
    timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
    actionLabel: 'Completed Safe Battery Isolation & Drop-Off (Demo)',
    actionType: 'special_disposal',
    points: 50,
    scanId: 'demo-scan-1',
    isDemo: true,
  },
  {
    id: 'demo-pt-2',
    timestamp: new Date(Date.now() - 86400000 * 1).toISOString(),
    actionLabel: 'Salvaged & Reused Cooling Fan from Motherboard (Demo)',
    actionType: 'repair',
    points: 40,
    scanId: 'demo-scan-2',
    isDemo: true,
  },
  {
    id: 'demo-pt-3',
    timestamp: new Date().toISOString(),
    actionLabel: 'Reused Corrugated Shipping Cartons (Demo)',
    actionType: 'reuse',
    points: 30,
    scanId: 'demo-scan-3',
    isDemo: true,
  },
];

export const DEMO_BUSINESS_LOGS: BusinessWasteEntry[] = [
  {
    id: 'demo-biz-1',
    date: new Date(Date.now() - 86400000 * 14).toISOString().slice(0, 10),
    category: 'paper',
    materialDetail: 'Corrugated shipping cartons & office A4 paper',
    weightKg: 48.5,
    departmentOrSource: 'Receiving & Logistics Bay',
    isDemo: true,
  },
  {
    id: 'demo-biz-2',
    date: new Date(Date.now() - 86400000 * 10).toISOString().slice(0, 10),
    category: 'e-waste',
    materialDetail: 'Decommissioned keyboards, patch cables & 4 UPS units',
    weightKg: 19.2,
    departmentOrSource: 'IT Lab Floor 2',
    isDemo: true,
  },
  {
    id: 'demo-biz-3',
    date: new Date(Date.now() - 86400000 * 6).toISOString().slice(0, 10),
    category: 'plastic',
    materialDetail: 'Clean PET beverage bottles & HDPE pantry jugs',
    weightKg: 14.0,
    departmentOrSource: 'Campus Cafeteria',
    isDemo: true,
  },
  {
    id: 'demo-biz-4',
    date: new Date(Date.now() - 86400000 * 2).toISOString().slice(0, 10),
    category: 'metal',
    materialDetail: 'Aluminum beverage cans & broken steel shelving brackets',
    weightKg: 11.8,
    departmentOrSource: 'Maintenance & Pantry',
    isDemo: true,
  },
];

export const INITIAL_SHOUT_OUTS: ShoutOutPost[] = [
  {
    id: 'sample-so-1',
    createdAt: new Date(Date.now() - 3600000 * 28).toISOString(),
    nickname: 'Aarav_Eco',
    message:
      'Taped the terminals on 3 old phone power banks and dropped them off at the weekend e-waste collection booth instead of leaving them in a drawer!',
    actionTag: 'Safe E-Waste Drop',
    reactions: { leaf: 14, clap: 9, spark: 6 },
    isSample: true,
  },
  {
    id: 'sample-so-2',
    createdAt: new Date(Date.now() - 3600000 * 16).toISOString(),
    nickname: 'Meera_Maker',
    message:
      'Replaced a frayed power cord on our hostel electric kettle with help from the campus repair club. Saved it from the scrap bin.',
    actionTag: 'Repaired',
    reactions: { leaf: 19, clap: 12, spark: 8 },
    isSample: true,
  },
  {
    id: 'sample-so-3',
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    nickname: 'GreenHostelBlockB',
    message:
      'Flattened and bundled 18 kg of clean cardboard boxes from semester move-in for our local dry-waste collector.',
    actionTag: 'Recycled',
    reactions: { leaf: 11, clap: 7, spark: 4 },
    isSample: true,
  },
];
