// js/schools.js

const ALL_SCHOOLS = {
    // ONTARIO
    mcmaster: { name: "McMaster University", province: "ON", primary: "#7A003C", accent: "#FDBF57", scale: "mcmaster" },
    utoronto: { name: "University of Toronto", province: "ON", primary: "#002A5C", accent: "#008BB0", scale: "can_standard" },
    uottawa: { name: "University of Ottawa", province: "ON", primary: "#8F001A", accent: "#EEB111", scale: "ten_point" },
    western: { name: "Western University", province: "ON", primary: "#4F2683", accent: "#ffffff", scale: "percentage" },
    queens: { name: "Queen's University", province: "ON", primary: "#002452", accent: "#FEB70D", scale: "can_433" },
    waterloo: { name: "University of Waterloo", province: "ON", primary: "#FFD54F", accent: "#000000", scale: "percentage" },
    york: { name: "York University", province: "ON", primary: "#E31837", accent: "#000000", scale: "nine_point" },
    carleton: { name: "Carleton University", province: "ON", primary: "#000000", accent: "#DF1921", scale: "12_point" },
    brock: { name: "Brock University", province: "ON", primary: "#CC0000", accent: "#ffffff", scale: "percentage" },
    guelph: { name: "University of Guelph", province: "ON", primary: "#C20430", accent: "#FFC72A", scale: "percentage" },
    laurier: { name: "Wilfrid Laurier University", province: "ON", primary: "#330066", accent: "#FDB913", scale: "12_point" },
    ryerson: { name: "Toronto Metropolitan University", province: "ON", primary: "#004C9B", accent: "#FFC72A", scale: "can_standard" },
    windsor: { name: "University of Windsor", province: "ON", primary: "#005596", accent: "#FFCD00", scale: "can_standard" },
    trent: { name: "Trent University", province: "ON", primary: "#003520", accent: "#ffffff", scale: "percentage" },
    lakehead: { name: "Lakehead University", province: "ON", primary: "#004165", accent: "#ffffff", scale: "percentage" },
    laurentian: { name: "Laurentian University", province: "ON", primary: "#003057", accent: "#FFD200", scale: "percentage" },
    nipissing: { name: "Nipissing University", province: "ON", primary: "#003B5C", accent: "#00A9E0", scale: "percentage" },
    ontariotech: { name: "Ontario Tech University", province: "ON", primary: "#003C71", accent: "#EE7624", scale: "can_433" },
    ocad: { name: "OCAD University", province: "ON", primary: "#000000", accent: "#ffffff", scale: "can_433" },
    redeemer: { name: "Redeemer University", province: "ON", primary: "#C8102E", accent: "#002D72", scale: "can_standard" },

    // BRITISH COLUMBIA
    ubc: { name: "University of British Columbia", province: "BC", primary: "#002145", accent: "#97D4E9", scale: "can_433" },
    sfu: { name: "Simon Fraser University", province: "BC", primary: "#A6192E", accent: "#000000", scale: "can_433" },
    uvic: { name: "University of Victoria", province: "BC", primary: "#005493", accent: "#F5AA1C", scale: "nine_point" },
    unbc: { name: "University of Northern BC", province: "BC", primary: "#004B33", accent: "#FDB913", scale: "can_433" },
    tru: { name: "Thompson Rivers University", province: "BC", primary: "#003153", accent: "#ffffff", scale: "can_433" },
    capilano: { name: "Capilano University", province: "BC", primary: "#00263E", accent: "#96BC42", scale: "can_433" },
    viu: { name: "Vancouver Island University", province: "BC", primary: "#002452", accent: "#ffffff", scale: "can_433" },
    ufv: { name: "University of the Fraser Valley", province: "BC", primary: "#002B49", accent: "#ffffff", scale: "can_433" },
    twu: { name: "Trinity Western University", province: "BC", primary: "#002145", accent: "#FFC627", scale: "can_433" },
    kpu: { name: "Kwantlen Polytechnic University", province: "BC", primary: "#812028", accent: "#ffffff", scale: "can_433" },

    // ALBERTA
    ualberta: { name: "University of Alberta", province: "AB", primary: "#007C41", accent: "#FFCB05", scale: "can_standard" },
    ucalgary: { name: "University of Calgary", province: "AB", primary: "#FFCD00", accent: "#E31837", scale: "can_standard" },
    uleth: { name: "University of Lethbridge", province: "AB", primary: "#002A5C", accent: "#CBB677", scale: "can_standard" },
    macewan: { name: "MacEwan University", province: "AB", primary: "#CC0033", accent: "#ffffff", scale: "can_standard" },
    mru: { name: "Mount Royal University", province: "AB", primary: "#003366", accent: "#ffffff", scale: "can_standard" },
    athabasca: { name: "Athabasca University", province: "AB", primary: "#003F72", accent: "#ffffff", scale: "can_433" },

    // QUEBEC
    mcgill: { name: "McGill University", province: "QC", primary: "#ED1B2F", accent: "#ffffff", scale: "can_433" },
    concordia: { name: "Concordia University", province: "QC", primary: "#912338", accent: "#ffffff", scale: "can_433" },
    laval: { name: "Université Laval", province: "QC", primary: "#FFCD00", accent: "#E31837", scale: "can_433" },
    umontreal: { name: "Université de Montréal", province: "QC", primary: "#005596", accent: "#ffffff", scale: "can_433" },
    usherbrooke: { name: "Université de Sherbrooke", province: "QC", primary: "#008B47", accent: "#ffffff", scale: "can_433" },
    uqam: { name: "UQAM", province: "QC", primary: "#003E7E", accent: "#ffffff", scale: "can_433" },
    bishop: { name: "Bishop's University", province: "QC", primary: "#4F2683", accent: "#ffffff", scale: "can_433" },

    // ATLANTIC
    dalhousie: { name: "Dalhousie University", province: "NS", primary: "#242424", accent: "#FFD400", scale: "can_433" },
    mun: { name: "Memorial University", province: "NL", primary: "#8E2420", accent: "#ffffff", scale: "can_433" },
    unb: { name: "University of New Brunswick", province: "NB", primary: "#ED1B2F", accent: "#000000", scale: "can_433" },
    upei: { name: "UPEI", province: "PE", primary: "#004B33", accent: "#FDB913", scale: "can_433" },
    acadia: { name: "Acadia University", province: "NS", primary: "#002A5C", accent: "#ffffff", scale: "can_433" },
    stfx: { name: "St. Francis Xavier", province: "NS", primary: "#002145", accent: "#ffffff", scale: "can_standard" },
    smu: { name: "Saint Mary's University", province: "NS", primary: "#8F001A", accent: "#ffffff", scale: "can_433" },
    mta: { name: "Mount Allison University", province: "NB", primary: "#8E2420", accent: "#ffffff", scale: "can_433" },

    // SASKATCHEWAN & MANITOBA
    usask: { name: "University of Saskatchewan", province: "SK", primary: "#006B3F", accent: "#ffffff", scale: "can_percentage" },
    uregina: { name: "University of Regina", province: "SK", primary: "#004B33", accent: "#FDB913", scale: "can_standard" },
    umanitoba: { name: "University of Manitoba", province: "MB", primary: "#9D162E", accent: "#F2A900", scale: "can_433" },
    uwinnipeg: { name: "University of Winnipeg", province: "MB", primary: "#A6192E", accent: "#ffffff", scale: "can_standard" },
    brandon: { name: "Brandon University", province: "MB", primary: "#002F6C", accent: "#ffffff", scale: "can_standard" }
};

const GRADING_SCALES = {
    // --- NORTH AMERICA ---
    us_40: { label: "US/Canada (4.0)", map: { 'A+': 4.0, 'A': 4.0, 'A-': 3.7, 'B+': 3.3, 'B': 3.0, 'B-': 2.7, 'C+': 2.3, 'C': 2.0, 'C-': 1.7, 'D': 1.0, 'F': 0.0 } },
    can_433: { label: "Canada (4.33)", map: { 'A+': 4.33, 'A': 4.0, 'A-': 3.67, 'B+': 3.33, 'B': 3.0, 'B-': 2.67, 'C+': 2.33, 'C': 2.0, 'C-': 1.67, 'D': 1.0, 'F': 0.0 } },
    mcmaster: { label: "McMaster (12pt)", map: { 'A+': 12, 'A': 11, 'A-': 10, 'B+': 9, 'B': 8, 'B-': 7, 'C+': 6, 'C': 5, 'C-': 4, 'D+': 3, 'D': 2, 'D-': 1, 'F': 0 } },

    // --- EUROPE & UK (THE MOST DIVERSE) ---
    uk_honours: {
        label: "UK/Ireland/Australia Honours",
        map: { '1st': 4.0, '2:1': 3.3, '2:2': 2.7, '3rd': 2.0, 'Pass': 1.0, 'Fail': 0.0 },
        boundaries: [{ l: '1st', v: 70 }, { l: '2:1', v: 60 }, { l: '2:2', v: 50 }, { l: '3rd', v: 45 }, { l: 'Pass', v: 40 }]
    },
    germany_reverse: {
        label: "Germany (1.0 Best)",
        map: { '1.0': 4.0, '1.3': 3.7, '1.7': 3.3, '2.0': 3.0, '2.3': 2.7, '2.7': 2.3, '3.0': 2.0, '3.3': 1.7, '3.7': 1.3, '4.0': 1.0, '5.0': 0.0 },
        boundaries: [{ l: '1.0', v: 95 }, { l: '1.3', v: 90 }, { l: '1.7', v: 85 }, { l: '2.0', v: 80 }, { l: '2.3', v: 75 }, { l: '2.7', v: 70 }, { l: '3.0', v: 65 }, { l: '3.3', v: 60 }, { l: '3.7', v: 55 }, { l: '4.0', v: 50 }]
    },
    france_20: {
        label: "France/Lebanon (0-20)",
        map: { 'Tres Bien': 4.0, 'Bien': 3.7, 'Assez Bien': 3.3, 'Passable': 3.0, 'Ajourne': 0.0 },
        boundaries: [{ l: 'Tres Bien', v: 16 }, { l: 'Bien', v: 14 }, { l: 'Assez Bien', v: 12 }, { l: 'Passable', v: 10 }]
    },
    scandinavia_7: {
        label: "Denmark (7-step)",
        map: { '12': 4.0, '10': 3.5, '7': 3.0, '4': 2.5, '02': 2.0, '00': 0.0, '-3': -1.0 },
        boundaries: [{ l: '12', v: 90 }, { l: '10', v: 80 }, { l: '7', v: 65 }, { l: '4', v: 55 }, { l: '02', v: 50 }]
    },
    switzerland_6: {
        label: "Switzerland (6.0 Best)",
        map: { '6.0': 4.0, '5.5': 3.7, '5.0': 3.3, '4.5': 3.0, '4.0': 2.0, '<4': 0.0 },
        boundaries: [{ l: '6.0', v: 95 }, { l: '5.5', v: 85 }, { l: '5.0', v: 75 }, { l: '4.5', v: 65 }, { l: '4.0', v: 60 }]
    },
    italy_30: {
        label: "Italy (0-30)",
        map: { '30L': 4.0, '30': 3.7, '28': 3.3, '26': 3.0, '24': 2.7, '18': 2.0, '<18': 0.0 },
        boundaries: [{ l: '30L', v: 30 }, { l: '30', v: 29 }, { l: '28', v: 27 }, { l: '26', v: 25 }, { l: '24', v: 23 }, { l: '18', v: 18 }]
    },

    // --- ASIA & OCEANIA ---
    india_10: {
        label: "India (10pt CGPA)",
        map: { 'O': 10, 'A+': 9, 'A': 8, 'B+': 7, 'B': 6, 'C': 5, 'P': 4, 'F': 0 },
        boundaries: [{ l: 'O', v: 90 }, { l: 'A+', v: 80 }, { l: 'A', v: 70 }, { l: 'B+', v: 60 }, { l: 'B', v: 55 }, { l: 'C', v: 50 }, { l: 'P', v: 40 }]
    },
    australia_7: {
        label: "Australia (7.0 Scale)",
        map: { 'HD': 7.0, 'D': 6.0, 'C': 5.0, 'P': 4.0, 'F': 0.0 },
        boundaries: [{ l: 'HD', v: 85 }, { l: 'D', v: 75 }, { l: 'C', v: 65 }, { l: 'P', v: 50 }]
    },
    china_5: {
        label: "China (5.0 Scale)",
        map: { 'Excellent': 5.0, 'Good': 4.0, 'Average': 3.0, 'Pass': 2.0, 'Fail': 0.0 },
        boundaries: [{ l: 'Excellent', v: 90 }, { l: 'Good', v: 80 }, { l: 'Average', v: 70 }, { l: 'Pass', v: 60 }]
    },

    // --- AFRICA & MIDDLE EAST ---
    west_africa_waec: {
        label: "West Africa (WASSCE)",
        map: { 'A1': 4.0, 'B2': 3.5, 'B3': 3.0, 'C4': 2.5, 'C5': 2.0, 'C6': 1.5, 'F9': 0.0 },
        boundaries: [{ l: 'A1', v: 80 }, { l: 'B2', v: 70 }, { l: 'B3', v: 65 }, { l: 'C4', v: 60 }, { l: 'C5', v: 55 }, { l: 'C6', v: 50 }]
    },
    russia_5: {
        label: "Russia/Slavic (2-5)",
        map: { '5': 4.0, '4': 3.0, '3': 2.0, '2': 0.0 },
        boundaries: [{ l: '5', v: 85 }, { l: '4', v: 70 }, { l: '3', v: 50 }]
    },

    // --- LATIN AMERICA ---
    brazil_10: {
        label: "Brazil (0-10)",
        map: { '9-10': 4.0, '7-8.9': 3.0, '5-6.9': 2.0, '<5': 0.0 },
        boundaries: [{ l: '9-10', v: 9 }, { l: '7-8.9', v: 7 }, { l: '5-6.9', v: 5 }]
    },
    chile_7: {
        label: "Chile (1.0-7.0)",
        map: { '7.0': 4.0, '6.0': 3.5, '5.0': 3.0, '4.0': 2.0, '<4': 0.0 },
        boundaries: [{ l: '7.0', v: 7 }, { l: '6.0', v: 6 }, { l: '5.0', v: 5 }, { l: '4.0', v: 4 }]
    }
};