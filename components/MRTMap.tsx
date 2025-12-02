'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';

// Map interaction constraints
const MAP_CONSTRAINTS = {
  minZoom: 0.5,      // Cannot zoom out beyond 50%
  maxZoom: 3.0,      // Cannot zoom in beyond 300%
  defaultZoom: 0.6,  // Initial zoom level
  zoomStep: 0.5,     // Zoom increment for buttons/double-tap
};

interface MRTMapProps {
  selectedStation: string | null;
  onStationClick: (stationId: string) => void;
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
  'changi-airport': { cx: 1389, cy: 717, name: 'Changi Airport' },

  // Regular stations (originally r="3", now r="7")
  'somerset': { cx: 702, cy: 632, name: 'Somerset' },
  'novena': { cx: 739, cy: 498, name: 'Novena' },
  'toa-payoh': { cx: 770, cy: 467, name: 'Toa Payoh' },
  'braddell': { cx: 786, cy: 428, name: 'Braddell' },
  'ang-mo-kio': { cx: 786, cy: 300, name: 'Ang Mo Kio' },
  'yio-chu-kang': { cx: 786, cy: 250, name: 'Yio Chu Kang' },
  'khatib': { cx: 786, cy: 202, name: 'Khatib' },
  'yishun': { cx: 775, cy: 144, name: 'Yishun' },
  'canberra': { cx: 735, cy: 104, name: 'Canberra' },
  'sembawang': { cx: 685, cy: 87, name: 'Sembawang' },
  'admiralty': { cx: 612, cy: 87, name: 'Admiralty' },
  'marsiling': { cx: 435, cy: 87, name: 'Marsiling' },
  'kranji': { cx: 352, cy: 87, name: 'Kranji' },
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
  'lakeside': { cx: 202, cy: 514, name: 'Lakeside' },
  'boon-lay': { cx: 120, cy: 514, name: 'Boon Lay' },
  'pioneer': { cx: 90, cy: 514, name: 'Pioneer' },
  'joo-koon': { cx: 75, cy: 542, name: 'Joo Koon' },
  'gul-circle': { cx: 75, cy: 570, name: 'Gul Circle' },
  'tuas-crescent': { cx: 75, cy: 598, name: 'Tuas Crescent' },
  'tuas-west-road': { cx: 75, cy: 616, name: 'Tuas West Road' },
  'tuas-link': { cx: 75, cy: 644, name: 'Tuas Link' },
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
  'nicoll-highway': { cx: 980, cy: 766, name: 'Nicoll Highway' },
  'stadium': { cx: 997, cy: 720, name: 'Stadium' },
  'mountbatten': { cx: 1002, cy: 695, name: 'Mountbatten' },
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
  'tanjong-rhu': { cx: 951, cy: 915, name: 'Tanjong Rhu' },
  'katong-park': { cx: 1001, cy: 865, name: 'Katong Park' },
  'tanjong-katong': { cx: 1027, cy: 829, name: 'Tanjong Katong' },
  'marine-parade': { cx: 1044, cy: 797, name: 'Marine Parade' },
  'marine-terrace': { cx: 1085, cy: 766, name: 'Marine Terrace' },
  'siglap': { cx: 1124, cy: 766, name: 'Siglap' },
  'bayshore': { cx: 1163, cy: 766, name: 'Bayshore' },

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

// Approximate real-world coordinates for stations (lat, lng)
// These are approximate and used for finding nearest station
const stationGeoCoordinates: { [key: string]: { lat: number, lng: number } } = {
  'newton': { lat: 1.3138, lng: 103.8380 },
  'orchard': { lat: 1.3043, lng: 103.8322 },
  'dhoby-ghaut': { lat: 1.2987, lng: 103.8456 },
  'city-hall': { lat: 1.2930, lng: 103.8520 },
  'raffles-place': { lat: 1.2840, lng: 103.8515 },
  'marina-bay': { lat: 1.2765, lng: 103.8545 },
  'bayfront': { lat: 1.2815, lng: 103.8590 },
  'promenade': { lat: 1.2930, lng: 103.8610 },
  'bugis': { lat: 1.3010, lng: 103.8560 },
  'little-india': { lat: 1.3067, lng: 103.8494 },
  'chinatown': { lat: 1.2845, lng: 103.8440 },
  'outram-park': { lat: 1.2803, lng: 103.8395 },
  'harbourfront': { lat: 1.2653, lng: 103.8210 },
  'bishan': { lat: 1.3510, lng: 103.8485 },
  'serangoon': { lat: 1.3500, lng: 103.8740 },
  'paya-lebar': { lat: 1.3175, lng: 103.8930 },
  'jurong-east': { lat: 1.3330, lng: 103.7425 },
  'tampines': { lat: 1.3540, lng: 103.9455 },
  'changi-airport': { lat: 1.3570, lng: 103.9880 },
  'woodlands': { lat: 1.4370, lng: 103.7865 },
  'ang-mo-kio': { lat: 1.3700, lng: 103.8495 },
  'toa-payoh': { lat: 1.3325, lng: 103.8470 },
  'somerset': { lat: 1.3005, lng: 103.8385 },
  'clementi': { lat: 1.3150, lng: 103.7650 },
  'boon-lay': { lat: 1.3385, lng: 103.7060 },
  'pasir-ris': { lat: 1.3730, lng: 103.9495 },
  'punggol': { lat: 1.4050, lng: 103.9025 },
  'sengkang': { lat: 1.3920, lng: 103.8955 },
  'bedok': { lat: 1.3240, lng: 103.9300 },
  'tanjong-pagar': { lat: 1.2765, lng: 103.8455 },
};

export default function MRTMap({ selectedStation, onStationClick }: MRTMapProps) {
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const transformRef = useRef<ReactZoomPanPinchRef>(null);
  const [svgLoaded, setSvgLoaded] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(MAP_CONSTRAINTS.defaultZoom);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    // Load the SVG and inject it into the DOM
    fetch('/mrt-map.svg')
      .then(response => response.text())
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
      });
  }, []);

  // Update selected station styling when selection changes
  useEffect(() => {
    if (!svgContainerRef.current || !svgLoaded) return;

    const svg = svgContainerRef.current.querySelector('svg');
    if (!svg) return;

    // Reset all station circles to white fill
    const circles = svg.querySelectorAll('circle[data-station-id]');
    circles.forEach(circle => {
      circle.setAttribute('fill', '#ffffff');
      (circle as HTMLElement).style.transform = 'scale(1)';
    });

    // Highlight selected station with red and pulse animation
    if (selectedStation) {
      const selectedCircle = svg.querySelector(`circle[data-station-id="${selectedStation}"]`);
      if (selectedCircle) {
        selectedCircle.setAttribute('fill', '#dc2626');
        // Add pulse effect
        (selectedCircle as HTMLElement).style.transform = 'scale(1.2)';
        setTimeout(() => {
          (selectedCircle as HTMLElement).style.transform = 'scale(1)';
        }, 150);
      }
    }
  }, [selectedStation, svgLoaded]);

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
          if (circle.getAttribute('fill') !== '#dc2626') {
            circle.setAttribute('fill', '#fca5a5');
          }
        });

        circle.addEventListener('mouseleave', () => {
          if (circle.getAttribute('fill') !== '#dc2626') {
            circle.setAttribute('fill', '#ffffff');
          }
        });
      }
    });
  };

  // Find nearest station to given coordinates
  const findNearestStation = useCallback((lat: number, lng: number): string | null => {
    let nearestStation: string | null = null;
    let minDistance = Infinity;

    for (const [stationId, coords] of Object.entries(stationGeoCoordinates)) {
      const distance = Math.sqrt(
        Math.pow(lat - coords.lat, 2) + Math.pow(lng - coords.lng, 2)
      );
      if (distance < minDistance) {
        minDistance = distance;
        nearestStation = stationId;
      }
    }

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
            // Calculate position to center the station
            transformRef.current.setTransform(
              -coords.cx * 1.5 + window.innerWidth / 2,
              -coords.cy * 1.5 + window.innerHeight / 2,
              1.5,
              300
            );
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
        minPositionX={-200}
        maxPositionX={100}
        minPositionY={-150}
        maxPositionY={100}
        alignmentAnimation={{ sizeX: 0, sizeY: 0 }}
        velocityAnimation={{ sensitivity: 1, animationTime: 300 }}
        panning={{
          velocityDisabled: false,
          lockAxisX: false,
          lockAxisY: false,
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
            <div className="fixed bottom-20 right-4 z-50 flex flex-col gap-2">
              {/* Location error toast */}
              {locationError && (
                <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-red-100 text-red-700 text-xs rounded-lg shadow-lg whitespace-nowrap">
                  {locationError}
                </div>
              )}

              <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-1.5 flex flex-col gap-1">
                {/* Zoom In */}
                <button
                  onClick={() => zoomIn(MAP_CONSTRAINTS.zoomStep)}
                  disabled={isAtMaxZoom}
                  className={`w-11 h-11 flex items-center justify-center rounded-lg text-xl font-bold transition-all
                    ${isAtMaxZoom
                      ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                      : 'bg-white hover:bg-gray-100 text-gray-700 active:scale-95'
                    }`}
                  aria-label="Zoom in"
                >
                  +
                </button>

                {/* Zoom Out */}
                <button
                  onClick={() => zoomOut(MAP_CONSTRAINTS.zoomStep)}
                  disabled={isAtMinZoom}
                  className={`w-11 h-11 flex items-center justify-center rounded-lg text-xl font-bold transition-all
                    ${isAtMinZoom
                      ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                      : 'bg-white hover:bg-gray-100 text-gray-700 active:scale-95'
                    }`}
                  aria-label="Zoom out"
                >
                  -
                </button>

                <div className="h-px bg-gray-200 mx-1" />

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
