'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import { StationSearchResult } from '@/lib/api';

// Map interaction constraints
const MAP_CONSTRAINTS = {
  minZoom: 0.5,      // Cannot zoom out beyond 50%
  maxZoom: 3.0,      // Cannot zoom in beyond 300%
  defaultZoom: 0.85, // Initial zoom level (more zoomed in)
  zoomStep: 0.5,     // Zoom increment for buttons/double-tap
};

interface MRTMapProps {
  selectedStation: string | null;
  onStationClick: (stationId: string) => void;
  searchResults?: StationSearchResult[];
  onZoomHandlerReady?: (handler: (stationId: string) => void) => void;
}

// Station coordinates for centering and location finding
const stationCoordinates: { [key: string]: { cx: number, cy: number, name: string } } = {
  // Major interchange stations (originally r="6", now r="10")
  'newton': { cx: 705, cy: 532, name: 'Newton' },
  'orchard': { cx: 660, cy: 583, name: 'Orchard' },
  'dhoby-ghaut': { cx: 760, cy: 689, name: 'Dhoby Ghaut' },
  'city-hall': { cx: 830, cy: 790, name: 'City Hall' },
  'raffles-place': { cx: 799, cy: 822, name: 'Raffles Place' },
  'marina-bay': { cx: 786, cy: 916, name: 'Marina Bay' },
  'bayfront': { cx: 887, cy: 871, name: 'Bayfront' },
  'promenade': { cx: 953, cy: 806, name: 'Promenade' },
  'bugis': { cx: 899, cy: 726, name: 'Bugis' },
  'little-india': { cx: 780, cy: 607, name: 'Little India' },
  'chinatown': { cx: 694, cy: 754, name: 'Chinatown' },
  'outram-park': { cx: 657, cy: 791, name: 'Outram Park' },
  'harbourfront': { cx: 581, cy: 866, name: 'HarbourFront' },
  'bishan': { cx: 786, cy: 394, name: 'Bishan' },
  'serangoon': { cx: 923, cy: 463, name: 'Serangoon' },
  'paya-lebar': { cx: 1005, cy: 639, name: 'Paya Lebar' },
  'macpherson': { cx: 995, cy: 580, name: 'MacPherson' },
  'jurong-east': { cx: 286, cy: 514, name: 'Jurong East' },
  'tampines': { cx: 1245, cy: 581, name: 'Tampines' },
  'expo': { cx: 1286, cy: 674, name: 'Expo' },
  'tanah-merah': { cx: 1227, cy: 639, name: 'Tanah Merah' },
  'buona-vista': { cx: 481, cy: 599, name: 'Buona Vista' },
  'botanic-gardens': { cx: 548, cy: 472, name: 'Botanic Gardens' },
  'stevens': { cx: 658, cy: 486, name: 'Stevens' },
  'caldecott': { cx: 658, cy: 403, name: 'Caldecott' },
  'woodlands': { cx: 549, cy: 87, name: 'Woodlands' },
  'bukit-panjang': { cx: 479, cy: 226, name: 'Bukit Panjang' },
  'choa-chu-kang': { cx: 286, cy: 226, name: 'Choa Chu Kang' },
  'sengkang': { cx: 1081, cy: 305, name: 'Sengkang' },
  'punggol': { cx: 1177, cy: 210, name: 'Punggol' },
  'changi-airport': { cx: 1334, cy: 674, name: 'Changi Airport' },

  // Regular stations (originally r="3", now r="7")
  'somerset': { cx: 702, cy: 632, name: 'Somerset' },
  'novena': { cx: 739, cy: 498, name: 'Novena' },
  'toa-payoh': { cx: 770, cy: 467, name: 'Toa Payoh' },
  'braddell': { cx: 786, cy: 428, name: 'Braddell' },
  'ang-mo-kio': { cx: 786, cy: 331, name: 'Ang Mo Kio' },
  'yio-chu-kang': { cx: 786, cy: 269, name: 'Yio Chu Kang' },
  'khatib': { cx: 786, cy: 202, name: 'Khatib' },
  'yishun': { cx: 775, cy: 144, name: 'Yishun' },
  'canberra': { cx: 735, cy: 104, name: 'Canberra' },
  'sembawang': { cx: 685, cy: 87, name: 'Sembawang' },
  'admiralty': { cx: 612, cy: 87, name: 'Admiralty' },
  'marsiling': { cx: 435, cy: 87, name: 'Marsiling' },
  'kranji': { cx: 347, cy: 87, name: 'Kranji' },
  'yew-tee': { cx: 286, cy: 173, name: 'Yew Tee' },
  'bukit-gombak': { cx: 286, cy: 291, name: 'Bukit Gombak' },
  'bukit-batok': { cx: 286, cy: 351, name: 'Bukit Batok' },
  'bukit-batok-alt': { cx: 286, cy: 413, name: 'Bukit Batok' },
  'bras-basah': { cx: 824, cy: 739, name: 'Bras Basah' },
  'esplanade': { cx: 870, cy: 785, name: 'Esplanade' },
  'clarke-quay': { cx: 724, cy: 725, name: 'Clarke Quay' },
  'lavender': { cx: 926, cy: 698, name: 'Lavender' },
  'kallang': { cx: 946, cy: 678, name: 'Kallang' },
  'aljunied': { cx: 984, cy: 643, name: 'Aljunied' },
  'eunos': { cx: 1066, cy: 639, name: 'Eunos' },
  'kembangan': { cx: 1126, cy: 639, name: 'Kembangan' },
  'bedok': { cx: 1186, cy: 639, name: 'Bedok' },
  'simei': { cx: 1245, cy: 614, name: 'Simei' },
  'pasir-ris': { cx: 1283, cy: 525, name: 'Pasir Ris' },
  'queenstown': { cx: 519, cy: 637, name: 'Queenstown' },
  'commonwealth': { cx: 555, cy: 673, name: 'Commonwealth' },
  'dover': { cx: 451, cy: 570, name: 'Dover' },
  'clementi': { cx: 407, cy: 526, name: 'Clementi' },
  'chinese-garden': { cx: 247, cy: 514, name: 'Chinese Garden' },
  'lakeside': { cx: 205, cy: 514, name: 'Lakeside' },
  'boon-lay': { cx: 155, cy: 489, name: 'Boon Lay' },
  'pioneer': { cx: 155, cy: 453, name: 'Pioneer' },
  'joo-koon': { cx: 155, cy: 417, name: 'Joo Koon' },
  'gul-circle': { cx: 155, cy: 381, name: 'Gul Circle' },
  'tuas-crescent': { cx: 155, cy: 345, name: 'Tuas Crescent' },
  'tuas-west-road': { cx: 155, cy: 309, name: 'Tuas West Road' },
  'tuas-link': { cx: 155, cy: 273, name: 'Tuas Link' },
  'tiong-bahru': { cx: 630, cy: 748, name: 'Tiong Bahru' },
  'redhill': { cx: 596, cy: 714, name: 'Redhill' },
  'tanjong-pagar': { cx: 699, cy: 848, name: 'Tanjong Pagar' },
  'farrer-park': { cx: 808, cy: 578, name: 'Farrer Park' },
  'boon-keng': { cx: 833, cy: 553, name: 'Boon Keng' },
  'potong-pasir': { cx: 861, cy: 525, name: 'Potong Pasir' },
  'woodleigh': { cx: 888, cy: 498, name: 'Woodleigh' },
  'kovan': { cx: 956, cy: 430, name: 'Kovan' },
  'hougang': { cx: 988, cy: 399, name: 'Hougang' },
  'buangkok': { cx: 1018, cy: 368, name: 'Buangkok' },
  'punggol-coast': { cx: 1230, cy: 157, name: 'Punggol Coast' },

  // Circle Line stations
  'nicoll-highway': { cx: 988, cy: 750, name: 'Nicoll Highway' },
  'stadium': { cx: 996, cy: 725, name: 'Stadium' },
  'mountbatten': { cx: 1002, cy: 694, name: 'Mountbatten' },
  'dakota': { cx: 1005, cy: 670, name: 'Dakota' },
  'tai-seng': { cx: 985, cy: 552, name: 'Tai Seng' },
  'bartley': { cx: 964, cy: 514, name: 'Bartley' },
  'lorong-chuan': { cx: 859, cy: 418, name: 'Lorong Chuan' },
  'marymount': { cx: 721, cy: 391, name: 'Marymount' },
  'farrer-road': { cx: 516, cy: 514, name: 'Farrer Road' },
  'holland-village': { cx: 497, cy: 549, name: 'Holland Village' },
  'one-north': { cx: 476, cy: 637, name: 'one-north' },
  'kent-ridge': { cx: 476, cy: 674, name: 'Kent Ridge' },
  'haw-par-villa': { cx: 481, cy: 709, name: 'Haw Par Villa' },
  'pasir-panjang': { cx: 494, cy: 750, name: 'Pasir Panjang' },
  'labrador-park': { cx: 514, cy: 792, name: 'Labrador Park' },
  'telok-blangah': { cx: 540, cy: 828, name: 'Telok Blangah' },

  // Downtown Line stations
  'cashew': { cx: 479, cy: 265, name: 'Cashew' },
  'hillview': { cx: 479, cy: 297, name: 'Hillview' },
  'hume': { cx: 479, cy: 329, name: 'Hume' },
  'beauty-world': { cx: 479, cy: 361, name: 'Beauty World' },
  'king-albert-park': { cx: 485, cy: 406, name: 'King Albert Park' },
  'sixth-avenue': { cx: 502, cy: 425, name: 'Sixth Avenue' },
  'tan-kah-kee': { cx: 524, cy: 448, name: 'Tan Kah Kee' },
  'rochor': { cx: 818, cy: 645, name: 'Rochor' },
  'downtown': { cx: 804, cy: 866, name: 'Downtown' },
  'telok-ayer': { cx: 742, cy: 803, name: 'Telok Ayer' },
  'fort-canning': { cx: 704, cy: 727, name: 'Fort Canning' },
  'bencoolen': { cx: 832, cy: 693, name: 'Bencoolen' },
  'jalan-besar': { cx: 865, cy: 660, name: 'Jalan Besar' },
  'bendemeer': { cx: 896, cy: 629, name: 'Bendemeer' },
  'geylang-bahru': { cx: 927, cy: 598, name: 'Geylang Bahru' },
  'mattar': { cx: 965, cy: 580, name: 'Mattar' },
  'ubi': { cx: 1046, cy: 580, name: 'Ubi' },
  'kaki-bukit': { cx: 1089, cy: 580, name: 'Kaki Bukit' },
  'bedok-north': { cx: 1129, cy: 580, name: 'Bedok North' },
  'bedok-reservoir': { cx: 1173, cy: 580, name: 'Bedok Reservoir' },
  'tampines-west': { cx: 1211, cy: 580, name: 'Tampines West' },
  'tampines-east': { cx: 1286, cy: 612, name: 'Tampines East' },
  'upper-changi': { cx: 1286, cy: 647, name: 'Upper Changi' },

  // Thomson-East Coast Line stations
  'woodlands-north': { cx: 496, cy: 34, name: 'Woodlands North' },
  'woodlands-south': { cx: 589, cy: 127, name: 'Woodlands South' },
  'springleaf': { cx: 624, cy: 162, name: 'Springleaf' },
  'lentor': { cx: 658, cy: 208, name: 'Lentor' },
  'mayflower': { cx: 658, cy: 247, name: 'Mayflower' },
  'bright-hill': { cx: 658, cy: 309, name: 'Bright Hill' },
  'upper-thomson': { cx: 658, cy: 357, name: 'Upper Thomson' },
  'napier': { cx: 658, cy: 517, name: 'Napier' },
  'orchard-boulevard': { cx: 658, cy: 549, name: 'Orchard Boulevard' },
  'great-world': { cx: 658, cy: 648, name: 'Great World' },
  'havelock': { cx: 658, cy: 694, name: 'Havelock' },
  'maxwell': { cx: 690, cy: 825, name: 'Maxwell' },
  'shenton-way': { cx: 745, cy: 881, name: 'Shenton Way' },
  'gardens-by-the-bay': { cx: 880, cy: 953, name: 'Gardens by the Bay' },
  'tanjong-rhu': { cx: 935, cy: 928, name: 'Tanjong Rhu' },
  'katong-park': { cx: 969, cy: 900, name: 'Katong Park' },
  'tanjong-katong': { cx: 1001, cy: 866, name: 'Tanjong Katong' },
  'marine-parade': { cx: 1027, cy: 828, name: 'Marine Parade' },
  'marine-terrace': { cx: 1094, cy: 766, name: 'Marine Terrace' },
  'siglap': { cx: 1153, cy: 766, name: 'Siglap' },
  'bayshore': { cx: 1196, cy: 766, name: 'Bayshore' },

  // EW Line additional
  'marina-south-pier': { cx: 786, cy: 962, name: 'Marina South Pier' },

  // Bukit Panjang LRT stations
  'south-view': { cx: 321, cy: 226, name: 'South View' },
  'keat-hong': { cx: 356, cy: 226, name: 'Keat Hong' },
  'teck-whye': { cx: 391, cy: 226, name: 'Teck Whye' },
  'phoenix': { cx: 426, cy: 226, name: 'Phoenix' },
  'petir': { cx: 521, cy: 245, name: 'Petir' },
  'pending': { cx: 546, cy: 259, name: 'Pending' },
  'bangkit': { cx: 565, cy: 248, name: 'Bangkit' },
  'fajar': { cx: 565, cy: 226, name: 'Fajar' },
  'segar': { cx: 565, cy: 204, name: 'Segar' },
  'jelapang': { cx: 546, cy: 192, name: 'Jelapang' },
  'senja': { cx: 521, cy: 206, name: 'Senja' },

  // Sengkang LRT stations
  'compassvale': { cx: 1127, cy: 321, name: 'Compassvale' },
  'rumbia': { cx: 1154, cy: 339, name: 'Rumbia' },
  'bakau': { cx: 1151, cy: 372, name: 'Bakau' },
  'kangkar': { cx: 1113, cy: 377, name: 'Kangkar' },
  'ranggung': { cx: 1096, cy: 349, name: 'Ranggung' },
  'cheng-lim': { cx: 1067, cy: 274, name: 'Cheng Lim' },
  'farmway': { cx: 1061, cy: 247, name: 'Farmway' },
  'kupang': { cx: 1044, cy: 229, name: 'Kupang' },
  'thanggam': { cx: 1022, cy: 229, name: 'Thanggam' },
  'fernvale': { cx: 1002, cy: 249, name: 'Fernvale' },
  'layar': { cx: 1004, cy: 270, name: 'Layar' },
  'tongkang': { cx: 1019, cy: 285, name: 'Tongkang' },
  'renjong': { cx: 1047, cy: 292, name: 'Renjong' },

  // Punggol LRT stations
  'cove': { cx: 1192, cy: 247, name: 'Cove' },
  'meridian': { cx: 1198, cy: 270, name: 'Meridian' },
  'coral-edge': { cx: 1215, cy: 287, name: 'Coral Edge' },
  'riviera': { cx: 1245, cy: 278, name: 'Riviera' },
  'kadaloor': { cx: 1254, cy: 247, name: 'Kadaloor' },
  'oasis': { cx: 1238, cy: 231, name: 'Oasis' },
  'damai': { cx: 1214, cy: 224, name: 'Damai' },
  'sam-kee': { cx: 1161, cy: 177, name: 'Sam Kee' },
  'teck-lee': { cx: 1156, cy: 150, name: 'Teck Lee' },
  'punggol-point': { cx: 1139, cy: 132, name: 'Punggol Point' },
  'samudera': { cx: 1106, cy: 144, name: 'Samudera' },
  'nibong': { cx: 1099, cy: 173, name: 'Nibong' },
  'sumang': { cx: 1116, cy: 190, name: 'Sumang' },
  'soo-teck': { cx: 1141, cy: 195, name: 'Soo Teck' },
};

// Real-world coordinates for stations (lat, lng)
// Used for finding nearest station based on user's GPS location
// Coordinates sourced from official LTA data for maximum accuracy
const stationGeoCoordinates: { [key: string]: { lat: number, lng: number } } = {
  // Major interchange stations
  'newton': { lat: 1.3129, lng: 103.8378 },
  'orchard': { lat: 1.3041, lng: 103.8318 },
  'dhoby-ghaut': { lat: 1.2989, lng: 103.8456 },
  'city-hall': { lat: 1.2929, lng: 103.8520 },
  'raffles-place': { lat: 1.2837, lng: 103.8512 },
  'marina-bay': { lat: 1.2762, lng: 103.8541 },
  'bayfront': { lat: 1.2820, lng: 103.8590 },
  'promenade': { lat: 1.2932, lng: 103.8611 },
  'bugis': { lat: 1.3006, lng: 103.8560 },
  'little-india': { lat: 1.3067, lng: 103.8494 },
  'chinatown': { lat: 1.2844, lng: 103.8441 },
  'outram-park': { lat: 1.2803, lng: 103.8398 },
  'harbourfront': { lat: 1.2653, lng: 103.8218 },
  'bishan': { lat: 1.3511, lng: 103.8484 },
  'serangoon': { lat: 1.3496, lng: 103.8733 },
  'paya-lebar': { lat: 1.3177, lng: 103.8926 },
  'jurong-east': { lat: 1.3332, lng: 103.7423 },
  'tampines': { lat: 1.3529, lng: 103.9451 },
  'changi-airport': { lat: 1.3573, lng: 103.9886 },
  'woodlands': { lat: 1.4370, lng: 103.7867 },
  'ang-mo-kio': { lat: 1.3700, lng: 103.8495 },
  'toa-payoh': { lat: 1.3327, lng: 103.8474 },
  'somerset': { lat: 1.3005, lng: 103.8389 },
  'clementi': { lat: 1.3152, lng: 103.7655 },
  'boon-lay': { lat: 1.3388, lng: 103.7059 },
  'pasir-ris': { lat: 1.3729, lng: 103.9493 },
  'punggol': { lat: 1.4050, lng: 103.9024 },
  'sengkang': { lat: 1.3916, lng: 103.8954 },
  'bedok': { lat: 1.3240, lng: 103.9300 },
  'tanjong-pagar': { lat: 1.2764, lng: 103.8453 },

  // North-South Line
  'yishun': { lat: 1.4292, lng: 103.8350 },
  'khatib': { lat: 1.4172, lng: 103.8330 },
  'yio-chu-kang': { lat: 1.3817, lng: 103.8448 },
  'braddell': { lat: 1.3407, lng: 103.8477 },
  'novena': { lat: 1.3204, lng: 103.8437 },
  'marina-south-pier': { lat: 1.2710, lng: 103.8635 },
  'bukit-batok': { lat: 1.3490, lng: 103.7496 },
  'bukit-gombak': { lat: 1.3587, lng: 103.7518 },
  'choa-chu-kang': { lat: 1.3854, lng: 103.7443 },
  'yew-tee': { lat: 1.3972, lng: 103.7470 },
  'kranji': { lat: 1.4251, lng: 103.7620 },
  'marsiling': { lat: 1.4326, lng: 103.7742 },
  'admiralty': { lat: 1.4406, lng: 103.8009 },
  'sembawang': { lat: 1.4491, lng: 103.8202 },
  'canberra': { lat: 1.4430, lng: 103.8297 },

  // East-West Line
  'chinese-garden': { lat: 1.3426, lng: 103.7327 },
  'lakeside': { lat: 1.3444, lng: 103.7209 },
  'pioneer': { lat: 1.3376, lng: 103.6974 },
  'joo-koon': { lat: 1.3277, lng: 103.6783 },
  'gul-circle': { lat: 1.3195, lng: 103.6605 },
  'tuas-crescent': { lat: 1.3210, lng: 103.6492 },
  'tuas-west-road': { lat: 1.3303, lng: 103.6397 },
  'tuas-link': { lat: 1.3404, lng: 103.6368 },
  'dover': { lat: 1.3113, lng: 103.7786 },
  'commonwealth': { lat: 1.3026, lng: 103.7979 },
  'queenstown': { lat: 1.2944, lng: 103.8061 },
  'redhill': { lat: 1.2896, lng: 103.8175 },
  'tiong-bahru': { lat: 1.2862, lng: 103.8270 },
  'lavender': { lat: 1.3075, lng: 103.8631 },
  'kallang': { lat: 1.3114, lng: 103.8715 },
  'aljunied': { lat: 1.3164, lng: 103.8824 },
  'eunos': { lat: 1.3198, lng: 103.9034 },
  'kembangan': { lat: 1.3211, lng: 103.9128 },
  'simei': { lat: 1.3434, lng: 103.9532 },

  // Circle Line
  'esplanade': { lat: 1.2935, lng: 103.8556 },
  'bras-basah': { lat: 1.2970, lng: 103.8507 },
  'nicoll-highway': { lat: 1.2997, lng: 103.8634 },
  'stadium': { lat: 1.3031, lng: 103.8753 },
  'mountbatten': { lat: 1.3063, lng: 103.8822 },
  'dakota': { lat: 1.3082, lng: 103.8879 },
  'tai-seng': { lat: 1.3358, lng: 103.8883 },
  'bartley': { lat: 1.3425, lng: 103.8797 },
  'lorong-chuan': { lat: 1.3516, lng: 103.8638 },
  'marymount': { lat: 1.3481, lng: 103.8396 },
  'farrer-road': { lat: 1.3172, lng: 103.8075 },
  'holland-village': { lat: 1.3124, lng: 103.7963 },
  'one-north': { lat: 1.2997, lng: 103.7872 },
  'kent-ridge': { lat: 1.2935, lng: 103.7845 },
  'haw-par-villa': { lat: 1.2825, lng: 103.7818 },
  'pasir-panjang': { lat: 1.2763, lng: 103.7914 },
  'labrador-park': { lat: 1.2722, lng: 103.8024 },
  'telok-blangah': { lat: 1.2705, lng: 103.8095 },

  // Downtown Line
  'bukit-panjang': { lat: 1.3792, lng: 103.7619 },
  'cashew': { lat: 1.3693, lng: 103.7719 },
  'hillview': { lat: 1.3625, lng: 103.7676 },
  'hume': { lat: 1.3526, lng: 103.7851 },
  'beauty-world': { lat: 1.3416, lng: 103.7759 },
  'king-albert-park': { lat: 1.3359, lng: 103.7834 },
  'sixth-avenue': { lat: 1.3309, lng: 103.7965 },
  'tan-kah-kee': { lat: 1.3256, lng: 103.8076 },
  'botanic-gardens': { lat: 1.3224, lng: 103.8155 },
  'stevens': { lat: 1.3200, lng: 103.8258 },
  'rochor': { lat: 1.3040, lng: 103.8524 },
  'downtown': { lat: 1.2795, lng: 103.8535 },
  'telok-ayer': { lat: 1.2822, lng: 103.8484 },
  'fort-canning': { lat: 1.2917, lng: 103.8446 },
  'bencoolen': { lat: 1.2986, lng: 103.8502 },
  'jalan-besar': { lat: 1.3053, lng: 103.8554 },
  'bendemeer': { lat: 1.3140, lng: 103.8619 },
  'geylang-bahru': { lat: 1.3215, lng: 103.8712 },
  'mattar': { lat: 1.3267, lng: 103.8828 },
  'ubi': { lat: 1.3299, lng: 103.8995 },
  'kaki-bukit': { lat: 1.3351, lng: 103.9081 },
  'bedok-north': { lat: 1.3346, lng: 103.9179 },
  'bedok-reservoir': { lat: 1.3362, lng: 103.9331 },
  'tampines-west': { lat: 1.3457, lng: 103.9378 },
  'tampines-east': { lat: 1.3566, lng: 103.9545 },
  'upper-changi': { lat: 1.3418, lng: 103.9615 },
  'expo': { lat: 1.3349, lng: 103.9616 },

  // North-East Line
  'buangkok': { lat: 1.3829, lng: 103.8928 },
  'hougang': { lat: 1.3712, lng: 103.8862 },
  'kovan': { lat: 1.3607, lng: 103.8849 },
  'woodleigh': { lat: 1.3394, lng: 103.8709 },
  'potong-pasir': { lat: 1.3318, lng: 103.8688 },
  'boon-keng': { lat: 1.3196, lng: 103.8617 },
  'farrer-park': { lat: 1.3121, lng: 103.8540 },
  'clarke-quay': { lat: 1.2887, lng: 103.8467 },

  // Thomson-East Coast Line
  'woodlands-north': { lat: 1.4481, lng: 103.7858 },
  'woodlands-south': { lat: 1.4276, lng: 103.7943 },
  'springleaf': { lat: 1.3979, lng: 103.8180 },
  'lentor': { lat: 1.3847, lng: 103.8368 },
  'mayflower': { lat: 1.3654, lng: 103.8366 },
  'bright-hill': { lat: 1.3631, lng: 103.8338 },
  'upper-thomson': { lat: 1.3548, lng: 103.8348 },
  'caldecott': { lat: 1.3376, lng: 103.8394 },
  'mount-pleasant': { lat: 1.3263, lng: 103.8353 },
  'napier': { lat: 1.3104, lng: 103.8265 },
  'orchard-boulevard': { lat: 1.3016, lng: 103.8328 },
  'great-world': { lat: 1.2935, lng: 103.8317 },
  'havelock': { lat: 1.2873, lng: 103.8352 },
  'maxwell': { lat: 1.2805, lng: 103.8445 },
  'shenton-way': { lat: 1.2790, lng: 103.8497 },
  'gardens-by-the-bay': { lat: 1.2817, lng: 103.8636 },
  'tanjong-rhu': { lat: 1.2942, lng: 103.8756 },
  'katong-park': { lat: 1.3031, lng: 103.8920 },
  'tanjong-katong': { lat: 1.3107, lng: 103.9027 },
  'marine-parade': { lat: 1.3023, lng: 103.9063 },
  'marine-terrace': { lat: 1.3014, lng: 103.9130 },
  'siglap': { lat: 1.3132, lng: 103.9265 },
  'bayshore': { lat: 1.3193, lng: 103.9378 },
};

export default function MRTMap({ selectedStation, onStationClick, searchResults = [], onZoomHandlerReady }: MRTMapProps) {
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const transformRef = useRef<ReactZoomPanPinchRef>(null);
  const previousSelectedStationRef = useRef<string | null>(null);
  const [svgLoaded, setSvgLoaded] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(MAP_CONSTRAINTS.defaultZoom);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Zoom handler for external components (like SearchResultsPanel)
  const zoomToStation = useCallback((stationId: string) => {
    if (transformRef.current && stationCoordinates[stationId]) {
      const coords = stationCoordinates[stationId];
      const padding = 300; // Container padding
      const scale = 1.8; // Zoom level for focused view
      // Account for padding when calculating position
      const stationX = coords.cx + padding;
      const stationY = coords.cy + padding;
      const posX = window.innerWidth / 2 - stationX * scale;
      const posY = window.innerHeight / 2 - stationY * scale;
      transformRef.current.setTransform(posX, posY, scale, 500);
    }
  }, []);

  // Expose zoom handler to parent component
  useEffect(() => {
    if (onZoomHandlerReady) {
      onZoomHandlerReady(zoomToStation);
    }
  }, [onZoomHandlerReady, zoomToStation]);

  useEffect(() => {
    // Load the SVG and inject it into the DOM
    fetch('/mrt-map.svg')
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.text();
      })
      .then(svgText => {
        if (svgContainerRef.current) {
          svgContainerRef.current.innerHTML = svgText;
          const svg = svgContainerRef.current.querySelector('svg');
          if (svg) {
            svg.style.width = '100%';
            svg.style.height = '100%';
            svg.style.maxWidth = 'none';

            // Clean up the SVG
            cleanupSvg(svg);

            // Make all station circles clickable
            makeStationsClickable(svg);
            setSvgLoaded(true);
          }
        }
      })
      .catch(error => {
        console.error('Error loading SVG:', error);
      });
  }, []);

  // Update selected station styling when selection changes
  useEffect(() => {
    if (!svgContainerRef.current || !svgLoaded) return;

    const svg = svgContainerRef.current.querySelector('svg');
    if (!svg) return;

    // Reset all station circles and remove old badges/pins
    const circles = svg.querySelectorAll('circle[data-station-id]');
    const oldBadges = svg.querySelectorAll('.result-badge, .result-badge-bg');
    const oldPins = svg.querySelectorAll('.station-pin-marker');
    oldBadges.forEach(badge => badge.remove());
    oldPins.forEach(pin => pin.remove());

    circles.forEach(circle => {
      circle.setAttribute('fill', '#ffffff');
      (circle as HTMLElement).style.transform = 'scale(1)';
      circle.classList.remove('station-highlighted', 'station-dimmed');
    });

    // Apply search result styling
    if (searchResults && searchResults.length > 0) {
      const searchResultIds = new Set(searchResults.map(r => r.stationId));

      // Dim non-matching stations
      circles.forEach(circle => {
        const stationId = circle.getAttribute('data-station-id');
        if (stationId && !searchResultIds.has(stationId)) {
          circle.classList.add('station-dimmed');
        }
      });

      // Highlight matching stations with floating pin markers
      searchResults.forEach(result => {
        const circle = svg.querySelector(`circle[data-station-id="${result.stationId}"]`) as SVGCircleElement;
        if (circle) {
          circle.classList.add('station-highlighted');

          // Add floating pin icon above the station
          const cx = parseFloat(circle.getAttribute('cx') || '0');
          const cy = parseFloat(circle.getAttribute('cy') || '0');

          // Create pin marker group
          const pinGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          pinGroup.classList.add('station-pin-marker');
          pinGroup.setAttribute('data-station-pin', result.stationId);

          // Pin icon (food/location marker) - positioned above station
          const pin = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          pin.setAttribute('x', String(cx));
          pin.setAttribute('y', String(cy - 18)); // Position above station
          pin.setAttribute('text-anchor', 'middle');
          pin.setAttribute('font-size', '16');
          pin.classList.add('pin-icon');
          pin.textContent = '📍';

          pinGroup.appendChild(pin);
          svg.appendChild(pinGroup);
        }
      });

      // Auto-zoom if 1-3 stations match
      if (searchResults.length > 0 && searchResults.length <= 3 && transformRef.current) {
        // Calculate bounding box of matching stations
        const validCoords: { cx: number, cy: number }[] = [];

        searchResults.forEach(result => {
          const coords = stationCoordinates[result.stationId];
          // Only include valid coordinates (must exist and be reasonable values)
          if (coords && coords.cx > 0 && coords.cy > 0) {
            validCoords.push(coords);
          }
        });

        // Only auto-zoom if we have valid coordinates
        if (validCoords.length > 0) {
          let minX = validCoords[0].cx, maxX = validCoords[0].cx;
          let minY = validCoords[0].cy, maxY = validCoords[0].cy;

          validCoords.forEach(coords => {
            minX = Math.min(minX, coords.cx);
            maxX = Math.max(maxX, coords.cx);
            minY = Math.min(minY, coords.cy);
            maxY = Math.max(maxY, coords.cy);
          });

          // Calculate center of matching stations
          const centerX = (minX + maxX) / 2;
          const centerY = (minY + maxY) / 2;

          // Account for padding in SVG container
          const padding = 300;
          const adjustedCenterX = centerX + padding;
          const adjustedCenterY = centerY + padding;

          // Calculate zoom to fit all stations
          const width = maxX - minX;
          const height = maxY - minY;
          const scale = validCoords.length === 1 ? 1.8 : Math.min(
            window.innerWidth / (width + 400),
            window.innerHeight / (height + 400),
            2.0
          );

          const posX = window.innerWidth / 2 - adjustedCenterX * scale;
          const posY = window.innerHeight / 2 - adjustedCenterY * scale;

          setTimeout(() => {
            transformRef.current?.setTransform(posX, posY, scale, 500);
          }, 100);
        }
      }
    }

    // Clear previous selected station highlighting
    if (previousSelectedStationRef.current && previousSelectedStationRef.current !== selectedStation) {
      const previousCircle = svg.querySelector(`circle[data-station-id="${previousSelectedStationRef.current}"]`);
      if (previousCircle) {
        previousCircle.setAttribute('fill', '#ffffff');
        (previousCircle as HTMLElement).style.transform = 'scale(1)';
      }
    }

    // Highlight selected station with red and pulse animation (takes priority over search results)
    if (selectedStation) {
      const selectedCircle = svg.querySelector(`circle[data-station-id="${selectedStation}"]`);
      if (selectedCircle) {
        selectedCircle.classList.remove('station-highlighted');
        selectedCircle.setAttribute('fill', '#dc2626');
        // Add pulse effect
        (selectedCircle as HTMLElement).style.transform = 'scale(1.2)';
        setTimeout(() => {
          (selectedCircle as HTMLElement).style.transform = 'scale(1)';
        }, 150);
      }
      previousSelectedStationRef.current = selectedStation;
    } else {
      previousSelectedStationRef.current = null;
    }
  }, [selectedStation, svgLoaded, searchResults]);

  const cleanupSvg = (svg: SVGSVGElement) => {
    // 1. Remove the legend area
    const legendGroup = svg.querySelector('g[transform="translate(0 -29.111)"]');
    if (legendGroup) {
      legendGroup.remove();
    }

    // 2. Remove all dotted/dashed lines (unconfirmed stations)
    const dashedElements = svg.querySelectorAll('[stroke-dasharray]');
    dashedElements.forEach(el => el.remove());

    // 3. Remove grey text (unconfirmed station names)
    const greyTexts = svg.querySelectorAll('text[fill="#aaaaaa"], g[fill="#aaaaaa"]');
    greyTexts.forEach(el => el.remove());

    // 4. Remove orphan circles - circles from future/unconfirmed lines
    const validLineColors = [
      '#009645', // North-South Line (green)
      '#d42e12', // East-West Line (red)
      '#9900aa', // North-East Line (purple)
      '#fa9e0d', // Circle Line (orange)
      '#005ec4', // Downtown Line (blue)
      '#784008', // Thomson-East Coast Line (brown)
      '#000000', // Interchange stations (black stroke)
      '#999999', // LRT stations (grey)
    ];

    const circles = svg.querySelectorAll('circle');
    circles.forEach(circle => {
      const r = parseFloat(circle.getAttribute('r') || '0');
      const stroke = circle.getAttribute('stroke');
      const parentGroup = circle.closest('g[stroke]');
      const parentStroke = parentGroup?.getAttribute('stroke');
      const effectiveStroke = stroke || parentStroke;

      const isValidSize = r === 3 || r === 6 || (r >= 2.5 && r <= 2.7);
      if (!isValidSize) {
        circle.remove();
        return;
      }

      if (effectiveStroke && !validLineColors.includes(effectiveStroke)) {
        circle.remove();
        return;
      }
    });

    // 5. Remove title text and standardize station text
    const allTexts = svg.querySelectorAll('text');
    allTexts.forEach(text => {
      const y = parseFloat(text.getAttribute('y') || '0');
      const textContent = text.textContent?.toLowerCase() || '';

      // Only remove title text, keep station names like "Woodlands North"
      const isStationName = textContent.includes('woodlands') ||
                            textContent.includes('north') ||
                            textContent.includes('station') ||
                            textContent.includes('mrt');

      if (y < 30 && !isStationName) {
        text.remove();
        return;
      }

      const currentFill = text.getAttribute('fill');
      if (currentFill !== '#ffffff') {
        text.setAttribute('fill', '#000000');
        text.setAttribute('font-size', '9');
        text.removeAttribute('font-weight');
      }
    });

    // 6. Make remaining station circles smaller for better text visibility
    const remainingCircles = svg.querySelectorAll('circle');
    remainingCircles.forEach(circle => {
      const r = parseFloat(circle.getAttribute('r') || '0');

      if (r === 6) {
        // Interchange stations - keep reasonable size
        circle.setAttribute('r', '6');
        circle.setAttribute('stroke-width', '2');
      } else if (r === 3) {
        // Regular stations - smaller
        circle.setAttribute('r', '4');
        circle.setAttribute('stroke-width', '1.5');
      } else if (r >= 2.5 && r <= 2.7) {
        // LRT stations - keep small
        circle.setAttribute('r', '3');
        circle.setAttribute('stroke-width', '1');
      }
    });

    // 7. Fix multi-line text and adjust positioning
    const textElements = svg.querySelectorAll('text');
    textElements.forEach(text => {
      // Check if text has tspan children (multi-line text)
      const tspans = text.querySelectorAll('tspan');
      if (tspans.length > 0) {
        // Get the first tspan's position
        const firstTspan = tspans[0];
        const baseX = firstTspan.getAttribute('x') || text.getAttribute('x') || '0';
        const baseY = firstTspan.getAttribute('y') || text.getAttribute('y') || '0';

        // Combine all tspan text into single line with space
        const fullText = Array.from(tspans).map(t => t.textContent?.trim()).join(' ');

        // Clear text and set combined content
        text.innerHTML = '';
        text.textContent = fullText;
        text.setAttribute('x', baseX);
        text.setAttribute('y', baseY);
      }

      // Make text more readable
      text.setAttribute('font-size', '9');
      text.setAttribute('font-family', 'Arial, sans-serif');

      const textContent = text.textContent?.toLowerCase() || '';
      const currentX = parseFloat(text.getAttribute('x') || '0');

      // Tuas/Gul/Joo Koon area - positions already fixed in SVG, skip manipulation
      if (textContent.includes('tuas') || textContent.includes('gul') ||
          textContent.includes('joo koon') || textContent.includes('pioneer') ||
          textContent.includes('boon lay')) {
        return; // Skip - positions are correct in SVG
      }

      // ISSUE 1: Thomson line stations (Bright Hill, Upper Thomson) - move to RIGHT like Mayflower
      if (textContent.includes('bright hill') || textContent.includes('upper thomson')) {
        text.setAttribute('x', String(currentX + 12));
        text.setAttribute('text-anchor', 'start');
        return;
      }

      // ISSUE 2: North-South line stations (Yishun to Ang Mo Kio) - single line, RIGHT side
      if (textContent.includes('yishun') || textContent.includes('khatib') ||
          textContent.includes('yio chu kang') || textContent.includes('ang mo kio') ||
          textContent.includes('canberra') || textContent.includes('sembawang')) {
        text.setAttribute('x', String(currentX + 12));
        text.setAttribute('text-anchor', 'start');
        return;
      }

      // Green line stations west of Jurong East
      if (textContent.includes('chinese garden') || textContent.includes('lakeside')) {
        text.setAttribute('x', String(currentX + 10));
        text.setAttribute('text-anchor', 'start');
        return;
      }

      // Green line stations east of Jurong East
      if (textContent.includes('clementi') || textContent.includes('dover') ||
          textContent.includes('buona vista') || textContent.includes('commonwealth') ||
          textContent.includes('queenstown') || textContent.includes('redhill') ||
          textContent.includes('tiong bahru')) {
        text.setAttribute('x', String(currentX + 8));
        text.setAttribute('text-anchor', 'start');
        return;
      }

      // Lorong Chuan - move left by 3px
      if (textContent.includes('lorong chuan')) {
        text.setAttribute('x', String(currentX - 3));
        text.setAttribute('text-anchor', 'start');
        return;
      }

      // Bayshore - move left by 20px
      if (textContent.includes('bayshore')) {
        text.setAttribute('x', String(currentX - 20));
        text.setAttribute('text-anchor', 'start');
        return;
      }

      // Default: small offset to avoid circle overlap
      text.setAttribute('x', String(currentX + 3));
      text.setAttribute('text-anchor', 'start');
    });
  };

  const makeStationsClickable = (svg: SVGSVGElement) => {
    const circles = svg.querySelectorAll('circle');

    circles.forEach(circle => {
      const cx = parseFloat(circle.getAttribute('cx') || '0');
      const cy = parseFloat(circle.getAttribute('cy') || '0');

      // Find matching station by coordinates (with tolerance)
      let matchedStation: string | null = null;
      for (const [stationId, coords] of Object.entries(stationCoordinates)) {
        if (Math.abs(cx - coords.cx) < 8 && Math.abs(cy - coords.cy) < 8) {
          matchedStation = stationId;
          break;
        }
      }

      if (matchedStation) {
        circle.setAttribute('data-station-id', matchedStation);
        circle.style.cursor = 'pointer';
        circle.style.transition = 'fill 0.2s ease, transform 0.15s ease';
        circle.style.transformOrigin = 'center';
        circle.style.transformBox = 'fill-box';

        circle.addEventListener('click', (e) => {
          e.stopPropagation();
          onStationClick(matchedStation!);
        });

        circle.addEventListener('mouseenter', () => {
          // Don't change fill if station is selected (red) or highlighted (green)
          if (circle.getAttribute('fill') !== '#dc2626' && !circle.classList.contains('station-highlighted')) {
            circle.setAttribute('fill', '#fca5a5');
          }
        });

        circle.addEventListener('mouseleave', () => {
          // Don't reset fill if station is selected (red) or highlighted (green)
          const currentFill = circle.getAttribute('fill');
          if (currentFill !== '#dc2626' && !circle.classList.contains('station-highlighted')) {
            circle.setAttribute('fill', '#ffffff');
          }
        });
      } else {
        // Remove circles that don't match any station coordinates (orphans)
        circle.remove();
      }
    });
  };

  // Calculate distance between two coordinates using Haversine formula
  // Returns distance in kilometers
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Find nearest station to given coordinates
  const findNearestStation = useCallback((lat: number, lng: number): string | null => {
    let nearestStation: string | null = null;
    let minDistance = Infinity;

    for (const [stationId, coords] of Object.entries(stationGeoCoordinates)) {
      const distance = calculateDistance(lat, lng, coords.lat, coords.lng);
      if (distance < minDistance) {
        minDistance = distance;
        nearestStation = stationId;
      }
    }

    console.log(`Nearest station: ${nearestStation} (${minDistance.toFixed(2)}km away)`);
    return nearestStation;
  }, []);

  // Handle location button click
  const handleLocationClick = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported');
      setTimeout(() => setLocationError(null), 3000);
      return;
    }

    setLocationLoading(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const nearestStation = findNearestStation(latitude, longitude);

        if (nearestStation) {
          onStationClick(nearestStation);

          // Center on the station
          if (transformRef.current && stationCoordinates[nearestStation]) {
            const coords = stationCoordinates[nearestStation];
            const padding = 300; // Container padding
            const scale = 1.5; // Zoom level for station view (more zoomed in)
            // Calculate position to center the station (accounting for padding)
            const stationX = coords.cx + padding;
            const stationY = coords.cy + padding;
            const posX = window.innerWidth / 2 - stationX * scale;
            const posY = window.innerHeight / 2 - stationY * scale;
            transformRef.current.setTransform(posX, posY, scale, 300);
          }
        }

        setLocationLoading(false);
      },
      (error) => {
        setLocationLoading(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError('Location permission denied');
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError('Location unavailable');
            break;
          case error.TIMEOUT:
            setLocationError('Location request timed out');
            break;
          default:
            setLocationError('Failed to get location');
        }
        setTimeout(() => setLocationError(null), 3000);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [findNearestStation, onStationClick]);

  // Handle zoom change for button states
  const handleZoomChange = useCallback((ref: ReactZoomPanPinchRef) => {
    setCurrentZoom(ref.state.scale);
  }, []);

  const isAtMinZoom = currentZoom <= MAP_CONSTRAINTS.minZoom;
  const isAtMaxZoom = currentZoom >= MAP_CONSTRAINTS.maxZoom;

  return (
    <div className="w-full h-full bg-white relative touch-none">
      <TransformWrapper
        ref={transformRef}
        initialScale={MAP_CONSTRAINTS.defaultZoom}
        minScale={MAP_CONSTRAINTS.minZoom}
        maxScale={MAP_CONSTRAINTS.maxZoom}
        centerOnInit={false}
        limitToBounds={false}
        alignmentAnimation={{ sizeX: 0, sizeY: 0 }}
        velocityAnimation={{ sensitivity: 1, animationTime: 300 }}
        panning={{
          disabled: false,
          velocityDisabled: false,
        }}
        onPanningStop={(ref) => {
          const { positionX, positionY, scale } = ref.state;
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;

          // Map boundaries (SVG dimensions + padding)
          const mapWidth = 1410 + 600; // SVG width + padding
          const mapHeight = 1007 + 600; // SVG height + padding

          // Calculate bounds to keep map visible (with 100px margin for tighter horizontal bounds)
          const margin = 100;
          const minX = viewportWidth - mapWidth * scale + margin;
          const maxX = -margin;
          const minY = viewportHeight - mapHeight * scale;
          const maxY = 0;

          // Clamp position to bounds
          let newX = positionX;
          let newY = positionY;

          if (positionX < minX) newX = minX;
          if (positionX > maxX) newX = maxX;
          if (positionY < minY) newY = minY;
          if (positionY > maxY) newY = maxY;

          // Only update if position changed
          if (newX !== positionX || newY !== positionY) {
            ref.setTransform(newX, newY, scale, 200);
          }
        }}
        doubleClick={{ mode: 'toggle', step: 1.5 }}
        pinch={{ step: 5 }}
        wheel={{ step: 0.1 }}
        onInit={(ref) => {
          // Center on the actual map content (approximately center of MRT network)
          // Map center is around (700, 500) in SVG coordinates
          // With container padding of 300px, actual position is (1000, 800)
          const mapCenterX = 700 + 300; // SVG center + padding
          const mapCenterY = 500 + 300; // SVG center + padding
          const scale = MAP_CONSTRAINTS.defaultZoom;
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;

          // Calculate position to center the map
          const posX = viewportWidth / 2 - mapCenterX * scale;
          const posY = viewportHeight / 2 - mapCenterY * scale;

          ref.setTransform(posX, posY, scale, 0);
        }}
        onZoom={handleZoomChange}
        onPanning={handleZoomChange}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            {/* Control Buttons */}
            <div className="fixed bottom-20 right-4 z-50 flex flex-col gap-2 pointer-events-none">
              {/* Location error toast */}
              {locationError && (
                <div className="mb-2 px-3 py-2 bg-red-100 text-red-700 text-xs rounded-lg shadow-lg whitespace-nowrap pointer-events-auto">
                  {locationError}
                </div>
              )}

              <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-1.5 flex flex-col gap-1 pointer-events-auto">
                {/* Reset View */}
                <button
                  onClick={() => {
                    // Reset to centered view on map content
                    const mapCenterX = 700 + 300;
                    const mapCenterY = 500 + 300;
                    const scale = MAP_CONSTRAINTS.defaultZoom;
                    const posX = window.innerWidth / 2 - mapCenterX * scale;
                    const posY = window.innerHeight / 2 - mapCenterY * scale;
                    transformRef.current?.setTransform(posX, posY, scale, 300);
                  }}
                  className="w-11 h-11 flex items-center justify-center bg-white hover:bg-gray-100 rounded-lg text-gray-700 transition-all active:scale-95"
                  aria-label="Reset view"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>

                {/* My Location */}
                <button
                  onClick={handleLocationClick}
                  disabled={locationLoading}
                  className={`w-11 h-11 flex items-center justify-center rounded-lg transition-all
                    ${locationLoading
                      ? 'bg-blue-50 text-blue-400'
                      : 'bg-white hover:bg-gray-100 text-gray-700 active:scale-95'
                    }`}
                  aria-label="Find nearest station"
                >
                  {locationLoading ? (
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>

              </div>
            </div>

            <TransformComponent
              wrapperClass="!w-full !h-full"
              contentClass="!w-full !h-full"
              wrapperStyle={{ touchAction: 'none' }}
            >
              <div
                ref={svgContainerRef}
                className="w-full h-full flex items-center justify-center"
                style={{ minWidth: '2800px', minHeight: '2000px', padding: '300px' }}
              />
            </TransformComponent>
          </>
        )}
      </TransformWrapper>
    </div>
  );
}
