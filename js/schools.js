// js/schools.js

const ALL_SCHOOLS = {
    // ONTARIO
    mcmaster: { name: "McMaster University", province: "ON", primary: "#7A003C", accent: "#FDBF57", scale: "mcmaster" },
    utoronto: { name: "University of Toronto", province: "ON", primary: "#002A5C", accent: "#008BB0", scale: "can_standard" },
    uottawa: { name: "University of Ottawa", province: "ON", primary: "#8F001A", accent: "#EEB111", scale: "ten_point" },
    western: { name: "Western University", province: "ON", primary: "#4F2683", accent: "#FDB515", scale: "percentage" },
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
    brandon: { name: "Brandon University", province: "MB", primary: "#002F6C", accent: "#ffffff", scale: "can_standard" },

    // UNITED STATES
    // ALABAMA
    ua: { name: "University of Alabama", province: "AL", primary: "#9E1B32", accent: "#ffffff", scale: "can_standard" },
    auburn: { name: "Auburn University", province: "AL", primary: "#03244D", accent: "#ffffff", scale: "can_standard" },
    uah: { name: "University of Alabama in Huntsville", province: "AL", primary: "#0B3D91", accent: "#ffffff", scale: "can_standard" },

    // ALASKA
    uaf: { name: "University of Alaska Fairbanks", province: "AK", primary: "#0F4C81", accent: "#ffffff", scale: "can_standard" },

    // ARIZONA
    arizona: { name: "University of Arizona", province: "AZ", primary: "#0C234B", accent: "#AB0520", scale: "can_standard" },
    arizona_state: { name: "Arizona State University", province: "AZ", primary: "#8C1D40", accent: "#ffffff", scale: "can_standard" },
    nau: { name: "Northern Arizona University", province: "AZ", primary: "#003A70", accent: "#ffffff", scale: "can_standard" },

    // ARKANSAS
    uark: { name: "University of Arkansas", province: "AR", primary: "#9C1831", accent: "#ffffff", scale: "can_standard" },
    arkansas_state: { name: "Arkansas State University", province: "AR", primary: "#CC0000", accent: "#ffffff", scale: "can_standard" },

    // CALIFORNIA
    caltech: { name: "California Institute of Technology", province: "CA", primary: "#0F4C81", accent: "#ffffff", scale: "can_standard" },
    stanford: { name: "Stanford University", province: "CA", primary: "#8C1515", accent: "#ffffff", scale: "can_standard" },
    ucla: { name: "University of California, Los Angeles", province: "CA", primary: "#2774AE", accent: "#FFD100", scale: "can_standard" },
    ucberkeley: { name: "University of California, Berkeley", province: "CA", primary: "#003262", accent: "#FDB515", scale: "can_standard" },
    ucsd: { name: "University of California, San Diego", province: "CA", primary: "#182B49", accent: "#C69214", scale: "can_standard" },
    uci: { name: "University of California, Irvine", province: "CA", primary: "#0064A4", accent: "#F1AB00", scale: "can_standard" },
    ucsb: { name: "University of California, Santa Barbara", province: "CA", primary: "#003660", accent: "#ffffff", scale: "can_standard" },
    ucsc: { name: "University of California, Santa Cruz", province: "CA", primary: "#115740", accent: "#ffffff", scale: "can_standard" },
    ucdavis: { name: "University of California, Davis", province: "CA", primary: "#183563", accent: "#ffbf00", scale: "can_standard" },
    ucr: { name: "University of California, Riverside", province: "CA", primary: "#2D6A4F", accent: "#ffffff", scale: "can_standard" },
    ucsf: { name: "University of California, San Francisco", province: "CA", primary: "#052049", accent: "#ffffff", scale: "can_standard" },
    usc: { name: "University of Southern California", province: "CA", primary: "#990000", accent: "#ffffff", scale: "can_standard" },
    sjsu: { name: "San Jose State University", province: "CA", primary: "#0055A2", accent: "#ffffff", scale: "can_standard" },
    csufullerton: { name: "California State University, Fullerton", province: "CA", primary: "#002A5C", accent: "#ffffff", scale: "can_standard" },
    csulb: { name: "California State University, Long Beach", province: "CA", primary: "#0D4F8B", accent: "#ffffff", scale: "can_standard" },
    sdsu: { name: "San Diego State University", province: "CA", primary: "#000000", accent: "#ffffff", scale: "can_standard" },
    pomona: { name: "Pomona College", province: "CA", primary: "#0A5E2F", accent: "#ffffff", scale: "can_standard" },

    // COLORADO
    cu_boulder: { name: "University of Colorado Boulder", province: "CO", primary: "#CFB87C", accent: "#000000", scale: "can_standard" },
    colorado_state: { name: "Colorado State University", province: "CO", primary: "#1E4D2B", accent: "#ffffff", scale: "can_standard" },
    du: { name: "University of Denver", province: "CO", primary: "#8B2332", accent: "#ffffff", scale: "can_standard" },

    // CONNECTICUT
    yale: { name: "Yale University", province: "CT", primary: "#0F4D92", accent: "#ffffff", scale: "can_standard" },
    uconn: { name: "University of Connecticut", province: "CT", primary: "#000E2F", accent: "#ffffff", scale: "can_standard" },
    quinnipiac: { name: "Quinnipiac University", province: "CT", primary: "#004A80", accent: "#ffffff", scale: "can_standard" },
    fairfield: { name: "Fairfield University", province: "CT", primary: "#002F6C", accent: "#ffffff", scale: "can_standard" },

    // DELAWARE
    udel: { name: "University of Delaware", province: "DE", primary: "#00539F", accent: "#ffffff", scale: "can_standard" },

    // DISTRICT OF COLUMBIA
    georgetown: { name: "Georgetown University", province: "DC", primary: "#011E41", accent: "#ffffff", scale: "can_standard" },
    gwu: { name: "George Washington University", province: "DC", primary: "#093162", accent: "#ffffff", scale: "can_standard" },

    // FLORIDA
    uflorida: { name: "University of Florida", province: "FL", primary: "#0021A5", accent: "#FA4616", scale: "can_standard" },
    ucf: { name: "University of Central Florida", province: "FL", primary: "#000000", accent: "#FFC904", scale: "can_standard" },
    fsu: { name: "Florida State University", province: "FL", primary: "#782F40", accent: "#CEB888", scale: "can_standard" },
    usf: { name: "University of South Florida", province: "FL", primary: "#006747", accent: "#ffffff", scale: "can_standard" },
    fiu: { name: "Florida International University", province: "FL", primary: "#C8102E", accent: "#ffffff", scale: "can_standard" },
    fit: { name: "Florida Institute of Technology", province: "FL", primary: "#003057", accent: "#ffffff", scale: "can_standard" },
    miami: { name: "University of Miami", province: "FL", primary: "#005030", accent: "#ffffff", scale: "can_standard" },

    // GEORGIA
    georgia_tech: { name: "Georgia Institute of Technology", province: "GA", primary: "#00223E", accent: "#EAAA00", scale: "can_standard" },
    uga: { name: "University of Georgia", province: "GA", primary: "#BA0C2F", accent: "#ffffff", scale: "can_standard" },
    emory: { name: "Emory University", province: "GA", primary: "#002878", accent: "#ffffff", scale: "can_standard" },
    georgia_state: { name: "Georgia State University", province: "GA", primary: "#0C2340", accent: "#ffffff", scale: "can_standard" },

    // HAWAII
    hawaii: { name: "University of Hawaiʻi at Mānoa", province: "HI", primary: "#024731", accent: "#ffffff", scale: "can_standard" },

    // IDAHO
    uidaho: { name: "University of Idaho", province: "ID", primary: "#D22630", accent: "#ffffff", scale: "can_standard" },
    boise_state: { name: "Boise State University", province: "ID", primary: "#D64309", accent: "#ffffff", scale: "can_standard" },

    // ILLINOIS
    northwestern: { name: "Northwestern University", province: "IL", primary: "#4E2A84", accent: "#ffffff", scale: "can_standard" },
    uiuc: { name: "University of Illinois Urbana-Champaign", province: "IL", primary: "#E84A27", accent: "#ffffff", scale: "can_standard" },
    uchicago: { name: "University of Chicago", province: "IL", primary: "#800000", accent: "#ffffff", scale: "can_standard" },
    loyola_chicago: { name: "Loyola University Chicago", province: "IL", primary: "#003057", accent: "#ffffff", scale: "can_standard" },
    depaul: { name: "DePaul University", province: "IL", primary: "#0057B8", accent: "#ffffff", scale: "can_standard" },
    illinois_state: { name: "Illinois State University", province: "IL", primary: "#CC0000", accent: "#ffffff", scale: "can_standard" },

    // INDIANA
    notre_dame: { name: "University of Notre Dame", province: "IN", primary: "#0C2340", accent: "#D39F10", scale: "can_standard" },
    purdue: { name: "Purdue University", province: "IN", primary: "#CEB888", accent: "#000000", scale: "can_standard" },
    indiana: { name: "Indiana University Bloomington", province: "IN", primary: "#7D110C", accent: "#ffffff", scale: "can_standard" },
    ball_state: { name: "Ball State University", province: "IN", primary: "#C41E3A", accent: "#ffffff", scale: "can_standard" },

    // IOWA
    uiowa: { name: "University of Iowa", province: "IA", primary: "#000000", accent: "#FFCD00", scale: "can_standard" },
    iowa_state: { name: "Iowa State University", province: "IA", primary: "#C8102E", accent: "#ffffff", scale: "can_standard" },

    // KANSAS
    ukansas: { name: "University of Kansas", province: "KS", primary: "#0051BA", accent: "#E8000D", scale: "can_standard" },
    kansas_state: { name: "Kansas State University", province: "KS", primary: "#512888", accent: "#ffffff", scale: "can_standard" },

    // KENTUCKY
    uky: { name: "University of Kentucky", province: "KY", primary: "#0033A0", accent: "#ffffff", scale: "can_standard" },
    louisville: { name: "University of Louisville", province: "KY", primary: "#AD0000", accent: "#ffffff", scale: "can_standard" },

    // LOUISIANA
    lsu: { name: "Louisiana State University", province: "LA", primary: "#461D7C", accent: "#FDD023", scale: "can_standard" },
    tulane: { name: "Tulane University", province: "LA", primary: "#005838", accent: "#ffffff", scale: "can_standard" },

    // MAINE
    umaine: { name: "University of Maine", province: "ME", primary: "#002F6C", accent: "#ffffff", scale: "can_standard" },

    // MARYLAND
    umaryland: { name: "University of Maryland, College Park", province: "MD", primary: "#E03A3E", accent: "#ffffff", scale: "can_standard" },
    jhu: { name: "Johns Hopkins University", province: "MD", primary: "#002D72", accent: "#ffffff", scale: "can_standard" },
    towson: { name: "Towson University", province: "MD", primary: "#FFD200", accent: "#000000", scale: "can_standard" },
    umbc: { name: "University of Maryland, Baltimore County", province: "MD", primary: "#0D2D5E", accent: "#ffffff", scale: "can_standard" },

    // MASSACHUSETTS
    harvard: { name: "Harvard University", province: "MA", primary: "#A41034", accent: "#ffffff", scale: "can_standard" },
    mit: { name: "Massachusetts Institute of Technology", province: "MA", primary: "#A31F34", accent: "#ffffff", scale: "can_standard" },
    bu: { name: "Boston University", province: "MA", primary: "#CC0000", accent: "#ffffff", scale: "can_standard" },
    northeastern: { name: "Northeastern University", province: "MA", primary: "#CC0000", accent: "#ffffff", scale: "can_standard" },
    umass_amherst: { name: "University of Massachusetts Amherst", province: "MA", primary: "#881C1C", accent: "#ffffff", scale: "can_standard" },
    tufts: { name: "Tufts University", province: "MA", primary: "#3E8EDE", accent: "#ffffff", scale: "can_standard" },
    bc: { name: "Boston College", province: "MA", primary: "#910F2B", accent: "#ffffff", scale: "can_standard" },

    // MICHIGAN
    umich: { name: "University of Michigan", province: "MI", primary: "#00274C", accent: "#FFCB05", scale: "can_standard" },
    michigan_state: { name: "Michigan State University", province: "MI", primary: "#18453B", accent: "#ffffff", scale: "can_standard" },
    wayne_state: { name: "Wayne State University", province: "MI", primary: "#005DAA", accent: "#ffffff", scale: "can_standard" },
    oakland: { name: "Oakland University", province: "MI", primary: "#000000", accent: "#ffffff", scale: "can_standard" },

    // MINNESOTA
    umn: { name: "University of Minnesota", province: "MN", primary: "#7A0019", accent: "#FFCC33", scale: "can_standard" },
    st_thomas: { name: "University of St. Thomas", province: "MN", primary: "#005596", accent: "#ffffff", scale: "can_standard" },
    minnesota_state: { name: "Minnesota State University, Mankato", province: "MN", primary: "#005CB9", accent: "#ffffff", scale: "can_standard" },

    // MISSISSIPPI
    olemiss: { name: "University of Mississippi", province: "MS", primary: "#CE1126", accent: "#ffffff", scale: "can_standard" },
    mississippi_state: { name: "Mississippi State University", province: "MS", primary: "#C8102E", accent: "#ffffff", scale: "can_standard" },

    // MISSOURI
    wustl: { name: "Washington University in St. Louis", province: "MO", primary: "#A6151B", accent: "#ffffff", scale: "can_standard" },
    mizzou: { name: "University of Missouri", province: "MO", primary: "#F1B82D", accent: "#000000", scale: "can_standard" },
    slu: { name: "Saint Louis University", province: "MO", primary: "#003DA5", accent: "#ffffff", scale: "can_standard" },

    // MONTANA
    umontana: { name: "University of Montana", province: "MT", primary: "#7A0019", accent: "#ffffff", scale: "can_standard" },
    montana_state: { name: "Montana State University", province: "MT", primary: "#0F4C81", accent: "#ffffff", scale: "can_standard" },

    // NEBRASKA
    unl: { name: "University of Nebraska-Lincoln", province: "NE", primary: "#D00000", accent: "#ffffff", scale: "can_standard" },
    creighton: { name: "Creighton University", province: "NE", primary: "#0054A6", accent: "#ffffff", scale: "can_standard" },

    // NEVADA
    unlv: { name: "University of Nevada, Las Vegas", province: "NV", primary: "#B10202", accent: "#ffffff", scale: "can_standard" },
    unr: { name: "University of Nevada, Reno", province: "NV", primary: "#003B71", accent: "#ffffff", scale: "can_standard" },

    // NEW HAMPSHIRE
    dartmouth: { name: "Dartmouth College", province: "NH", primary: "#00693E", accent: "#ffffff", scale: "can_standard" },
    unh: { name: "University of New Hampshire", province: "NH", primary: "#004B8D", accent: "#ffffff", scale: "can_standard" },

    // NEW JERSEY
    princeton: { name: "Princeton University", province: "NJ", primary: "#FF8F00", accent: "#000000", scale: "can_standard" },
    rutgers: { name: "Rutgers University", province: "NJ", primary: "#D21034", accent: "#ffffff", scale: "can_standard" },

    // NEW MEXICO
    unm: { name: "University of New Mexico", province: "NM", primary: "#BA0C2F", accent: "#ffffff", scale: "can_standard" },
    nmsu: { name: "New Mexico State University", province: "NM", primary: "#891216", accent: "#ffffff", scale: "can_standard" },

    // NEW YORK
    columbia: { name: "Columbia University", province: "NY", primary: "#9B1B30", accent: "#ffffff", scale: "can_standard" },
    cornell: { name: "Cornell University", province: "NY", primary: "#B31B1B", accent: "#ffffff", scale: "can_standard" },
    nyu: { name: "New York University", province: "NY", primary: "#57068C", accent: "#ffffff", scale: "can_standard" },
    stonybrook: { name: "Stony Brook University", province: "NY", primary: "#004A8D", accent: "#ffffff", scale: "can_standard" },
    buffalo: { name: "University at Buffalo", province: "NY", primary: "#005BBB", accent: "#ffffff", scale: "can_standard" },
    syracuse: { name: "Syracuse University", province: "NY", primary: "#D44500", accent: "#ffffff", scale: "can_standard" },
    rpi: { name: "Rensselaer Polytechnic Institute", province: "NY", primary: "#E4002B", accent: "#ffffff", scale: "can_standard" },
    binghamton: { name: "Binghamton University", province: "NY", primary: "#005A43", accent: "#ffffff", scale: "can_standard" },
    rochester: { name: "University of Rochester", province: "NY", primary: "#00467F", accent: "#ffffff", scale: "can_standard" },
    city_college: { name: "City College of New York", province: "NY", primary: "#004B8D", accent: "#ffffff", scale: "can_standard" },

    // NORTH CAROLINA
    duke: { name: "Duke University", province: "NC", primary: "#001A57", accent: "#ffffff", scale: "can_standard" },
    unc: { name: "University of North Carolina at Chapel Hill", province: "NC", primary: "#4B9CD3", accent: "#ffffff", scale: "can_standard" },
    nc_state: { name: "North Carolina State University", province: "NC", primary: "#CC0000", accent: "#ffffff", scale: "can_standard" },
    wake_forest: { name: "Wake Forest University", province: "NC", primary: "#000000", accent: "#ffffff", scale: "can_standard" },
    unc_charlotte: { name: "University of North Carolina at Charlotte", province: "NC", primary: "#005035", accent: "#ffffff", scale: "can_standard" },

    // NORTH DAKOTA
    und: { name: "University of North Dakota", province: "ND", primary: "#0F6CB6", accent: "#ffffff", scale: "can_standard" },
    ndsu: { name: "North Dakota State University", province: "ND", primary: "#0F0F0F", accent: "#ffffff", scale: "can_standard" },

    // OHIO
    ohio_state: { name: "The Ohio State University", province: "OH", primary: "#BB0000", accent: "#ffffff", scale: "can_standard" },
    miami_oh: { name: "Miami University", province: "OH", primary: "#AA0000", accent: "#ffffff", scale: "can_standard" },
    case_western: { name: "Case Western Reserve University", province: "OH", primary: "#0A3D91", accent: "#ffffff", scale: "can_standard" },
    ohio_university: { name: "Ohio University", province: "OH", primary: "#00694E", accent: "#ffffff", scale: "can_standard" },
    ucincinnati: { name: "University of Cincinnati", province: "OH", primary: "#E00122", accent: "#ffffff", scale: "can_standard" },

    // OKLAHOMA
    ou: { name: "University of Oklahoma", province: "OK", primary: "#841617", accent: "#ffffff", scale: "can_standard" },
    oklahoma_state: { name: "Oklahoma State University", province: "OK", primary: "#FF6600", accent: "#ffffff", scale: "can_standard" },

    // OREGON
    uoregon: { name: "University of Oregon", province: "OR", primary: "#154733", accent: "#ffffff", scale: "can_standard" },
    oregon_state: { name: "Oregon State University", province: "OR", primary: "#D73F09", accent: "#ffffff", scale: "can_standard" },
    portland_state: { name: "Portland State University", province: "OR", primary: "#1F3A5F", accent: "#ffffff", scale: "can_standard" },

    // PENNSYLVANIA
    upenn: { name: "University of Pennsylvania", province: "PA", primary: "#011F5B", accent: "#ffffff", scale: "can_standard" },
    pennstate: { name: "Pennsylvania State University", province: "PA", primary: "#001E44", accent: "#ffffff", scale: "can_standard" },
    cmu: { name: "Carnegie Mellon University", province: "PA", primary: "#CC0033", accent: "#ffffff", scale: "can_standard" },
    pitt: { name: "University of Pittsburgh", province: "PA", primary: "#003594", accent: "#ffffff", scale: "can_standard" },
    temple: { name: "Temple University", province: "PA", primary: "#A41E35", accent: "#ffffff", scale: "can_standard" },
    drexel: { name: "Drexel University", province: "PA", primary: "#0094D1", accent: "#ffffff", scale: "can_standard" },
    lehigh: { name: "Lehigh University", province: "PA", primary: "#653819", accent: "#ffffff", scale: "can_standard" },
    villanova: { name: "Villanova University", province: "PA", primary: "#00205B", accent: "#ffffff", scale: "can_standard" },

    // RHODE ISLAND
    brown: { name: "Brown University", province: "RI", primary: "#C00000", accent: "#ffffff", scale: "can_standard" },
    uri: { name: "University of Rhode Island", province: "RI", primary: "#75AADB", accent: "#ffffff", scale: "can_standard" },

    // SOUTH CAROLINA
    usc_sc: { name: "University of South Carolina", province: "SC", primary: "#73000A", accent: "#ffffff", scale: "can_standard" },
    clemson: { name: "Clemson University", province: "SC", primary: "#F56600", accent: "#522D80", scale: "can_standard" },

    // SOUTH DAKOTA
    sdsu_sd: { name: "South Dakota State University", province: "SD", primary: "#D1D5DB", accent: "#000000", scale: "can_standard" },
    usd: { name: "University of South Dakota", province: "SD", primary: "#003366", accent: "#ffffff", scale: "can_standard" },

    // TENNESSEE
    vanderbilt: { name: "Vanderbilt University", province: "TN", primary: "#000000", accent: "#ffffff", scale: "can_standard" },
    utk: { name: "University of Tennessee, Knoxville", province: "TN", primary: "#FF8200", accent: "#ffffff", scale: "can_standard" },
    tennessee_tech: { name: "Tennessee Tech University", province: "TN", primary: "#0047AB", accent: "#ffffff", scale: "can_standard" },

    // TEXAS
    rice: { name: "Rice University", province: "TX", primary: "#00205B", accent: "#ffffff", scale: "can_standard" },
    utexas: { name: "The University of Texas at Austin", province: "TX", primary: "#BF5700", accent: "#ffffff", scale: "can_standard" },
    tamu: { name: "Texas A&M University", province: "TX", primary: "#500000", accent: "#ffffff", scale: "can_standard" },
    utdallas: { name: "The University of Texas at Dallas", province: "TX", primary: "#E87500", accent: "#ffffff", scale: "can_standard" },
    uh: { name: "University of Houston", province: "TX", primary: "#C8102E", accent: "#ffffff", scale: "can_standard" },
    texas_tech: { name: "Texas Tech University", province: "TX", primary: "#CC0000", accent: "#ffffff", scale: "can_standard" },
    baylor: { name: "Baylor University", province: "TX", primary: "#003015", accent: "#ffffff", scale: "can_standard" },
    smu: { name: "Southern Methodist University", province: "TX", primary: "#0033A0", accent: "#ffffff", scale: "can_standard" },

    // UTAH
    utah: { name: "University of Utah", province: "UT", primary: "#CC0000", accent: "#ffffff", scale: "can_standard" },
    utah_state: { name: "Utah State University", province: "UT", primary: "#0F2439", accent: "#ffffff", scale: "can_standard" },
    byu: { name: "Brigham Young University", province: "UT", primary: "#002E5D", accent: "#ffffff", scale: "can_standard" },

    // VERMONT
    uvm: { name: "University of Vermont", province: "VT", primary: "#007C5B", accent: "#ffffff", scale: "can_standard" },

    // VIRGINIA
    uva: { name: "University of Virginia", province: "VA", primary: "#232D4B", accent: "#E57200", scale: "can_standard" },
    virginia_tech: { name: "Virginia Tech", province: "VA", primary: "#CF4420", accent: "#ffffff", scale: "can_standard" },
    george_mason: { name: "George Mason University", province: "VA", primary: "#006633", accent: "#ffffff", scale: "can_standard" },
    william_mary: { name: "William & Mary", province: "VA", primary: "#115740", accent: "#ffffff", scale: "can_standard" },

    // WASHINGTON
    washington: { name: "University of Washington", province: "WA", primary: "#4B2E83", accent: "#B7A57A", scale: "can_standard" },
    washington_state: { name: "Washington State University", province: "WA", primary: "#981E32", accent: "#ffffff", scale: "can_standard" },

    // WEST VIRGINIA
    wvu: { name: "West Virginia University", province: "WV", primary: "#EAAA00", accent: "#002855", scale: "can_standard" },
    marshall: { name: "Marshall University", province: "WV", primary: "#00B140", accent: "#ffffff", scale: "can_standard" },

    // WISCONSIN
    uwmadison: { name: "University of Wisconsin-Madison", province: "WI", primary: "#C5050C", accent: "#ffffff", scale: "can_standard" },
    marquette: { name: "Marquette University", province: "WI", primary: "#003366", accent: "#ffffff", scale: "can_standard" },
    uwmilwaukee: { name: "University of Wisconsin-Milwaukee", province: "WI", primary: "#000000", accent: "#ffffff", scale: "can_standard" },

    // WYOMING
    uwyo: { name: "University of Wyoming", province: "WY", primary: "#002D62", accent: "#ffffff", scale: "can_standard" }
};

const GRADING_SCALES = {
    mcmaster: { label: "GPA (12pt)", map: { 'A+': 12, 'A': 11, 'A-': 10, 'B+': 9, 'B': 8, 'B-': 7, 'C+': 6, 'C': 5, 'C-': 4, 'D+': 3, 'D': 2, 'D-': 1, 'F': 0 } },
    can_standard: { label: "GPA (4.0)", map: { 'A+': 4.0, 'A': 4.0, 'A-': 3.7, 'B+': 3.3, 'B': 3.0, 'B-': 2.7, 'C+': 2.3, 'C': 2.0, 'C-': 1.7, 'D': 1.0, 'F': 0.0 } },
    can_433: { label: "GPA (4.33)", map: { 'A+': 4.33, 'A': 4.0, 'A-': 3.67, 'B+': 3.33, 'B': 3.0, 'B-': 2.67, 'C+': 2.33, 'C': 2.0, 'C-': 1.67, 'D': 1.0, 'F': 0.0 } },
    percentage: { label: "Average (%)", map: { 'A+': 95, 'A': 87, 'A-': 82, 'B+': 78, 'B': 75, 'B-': 72, 'C+': 68, 'C': 65, 'C-': 62, 'D+': 58, 'D': 55, 'D-': 52, 'F': 35 } },
    nine_point: { label: "GPA (9pt)", map: { 'A+': 9, 'A': 8, 'B+': 7, 'B': 6, 'C+': 5, 'C': 4, 'D+': 3, 'D': 2, 'E': 1, 'F': 0 } },
    ten_point: { label: "GPA (10pt)", map: { 'A+': 10, 'A': 9, 'A-': 8, 'B+': 7, 'B': 6, 'C+': 5, 'C': 4, 'D+': 3, 'D': 2, 'E': 1, 'F': 0 } },
    twelve_point: { label: "GPA (12pt)", map: { 'A+': 12, 'A': 11, 'A-': 10, 'B+': 9, 'B': 8, 'B-': 7, 'C+': 6, 'C': 5, 'C-': 4, 'D+': 3, 'D': 2, 'D-': 1, 'F': 0 } }
};