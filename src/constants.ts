import { Product, Member, Announcement } from './types';

export const PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'ARMOR-LITE DUFFEL 2.0',
    price: 145,
    category: 'Equipment',
    description: 'Tactical-grade ballistic nylon. Separate ventilated shoe compartment. Matte black hardware.',
    image: 'https://picsum.photos/seed/duffel/800/600',
    sku: 'RF-DUF-002',
    stock: 15,
    isBestSeller: true,
  },
  {
    id: '2',
    name: 'ISOLATE FUEL',
    price: 64,
    category: 'Supplements',
    description: 'Chocolate Sea Salt | 2lb. Premium whey isolate.',
    image: 'https://picsum.photos/seed/whey/800/600',
    sku: 'RF-WHEY-001',
    stock: 12,
  },
  {
    id: '3',
    name: 'HEX PRO PAIR',
    price: 85,
    category: 'Equipment',
    description: 'Rubber Coated | 25LB. Professional grade dumbbells.',
    image: 'https://picsum.photos/seed/dumbbells/800/600',
    sku: 'RF-HEX-025',
    stock: 8,
  },
  {
    id: '4',
    name: 'VOID COMPRESSION',
    price: 42,
    category: 'Apparel',
    description: 'Vented Back | All Sizes. High-performance compression.',
    image: 'https://picsum.photos/seed/compression/800/600',
    sku: 'RF-APPA-042',
    stock: 5,
  },
  {
    id: '5',
    name: 'IGNITE PRE-WO',
    price: 52,
    category: 'Supplements',
    description: 'Blue Razz | 30 Servings. High-intensity pre-workout.',
    image: 'https://picsum.photos/seed/preworkout/800/600',
    sku: 'RF-SUPP-009',
    stock: 20,
  },
];

export const MEMBERS: Member[] = [
  {
    id: '1',
    name: 'Marcus Vane',
    tier: 'Expert',
    height: 188,
    weight: 94,
    focus: 'Hypertrophy',
    image: 'https://picsum.photos/seed/marcus/400/400',
  },
  {
    id: '2',
    name: 'Sarah Dracos',
    tier: 'Intermediate',
    height: 172,
    weight: 65,
    focus: 'Endurance',
    image: 'https://picsum.photos/seed/sarah/400/400',
  },
];

export const ANNOUNCEMENTS: Announcement[] = [
  {
    id: '1',
    date: '02 OCT 2023 | 09:45',
    title: 'New Platform Rack Installations',
    content: 'Three new competition-grade racks are now available in Zone B.',
    category: 'Facility',
  },
  {
    id: '2',
    date: '28 SEP 2023 | 14:20',
    title: 'Guest Pass Policy Update',
    content: 'Digital guest passes are now restricted to weekday hours only.',
    category: 'Policy',
  },
];

export const EXERCISES = [
  // --- CHEST ---
  { name: "Barbell Bench Press", target: "Chest", video: "https://www.youtube.com/results?search_query=proper+form+barbell+bench+press" },
  { name: "Incline Dumbbell Press", target: "Chest", video: "https://www.youtube.com/results?search_query=proper+form+incline+dumbbell+press" },
  { name: "Push-Ups", target: "Chest", video: "https://www.youtube.com/results?search_query=proper+form+push+ups" },
  { name: "Cable Crossovers", target: "Chest", video: "https://www.youtube.com/results?search_query=proper+form+cable+crossovers" },
  { name: "Flat Dumbbell Press", target: "Chest", video: "https://www.youtube.com/results?search_query=proper+form+flat+dumbbell+press" },
  { name: "Incline Barbell Press", target: "Chest", video: "https://www.youtube.com/results?search_query=proper+form+incline+barbell+press" },
  { name: "Chest Dips", target: "Chest", video: "https://www.youtube.com/results?search_query=proper+form+chest+dips" },
  { name: "Machine Chest Press", target: "Chest", video: "https://www.youtube.com/results?search_query=proper+form+machine+chest+press" },
  { name: "Pec Deck Fly", target: "Chest", video: "https://www.youtube.com/results?search_query=proper+form+pec+deck+fly" },

  // --- BACK ---
  { name: "Barbell Deadlift", target: "Back", video: "https://www.youtube.com/results?search_query=proper+form+barbell+deadlift" },
  { name: "Pull-Ups", target: "Back", video: "https://www.youtube.com/results?search_query=proper+form+pull+ups" },
  { name: "Lat Pulldown", target: "Back", video: "https://www.youtube.com/results?search_query=proper+form+lat+pulldown" },
  { name: "Barbell Bent Over Row", target: "Back", video: "https://www.youtube.com/results?search_query=proper+form+barbell+bent+over+row" },
  { name: "Seated Cable Row", target: "Back", video: "https://www.youtube.com/results?search_query=proper+form+seated+cable+row" },
  { name: "Single Arm Dumbbell Row", target: "Back", video: "https://www.youtube.com/results?search_query=proper+form+single+arm+dumbbell+row" },
  { name: "T-Bar Row", target: "Back", video: "https://www.youtube.com/results?search_query=proper+form+t+bar+row" },
  { name: "Chin-Ups", target: "Back", video: "https://www.youtube.com/results?search_query=proper+form+chin+ups" },
  { name: "Face Pulls", target: "Back", video: "https://www.youtube.com/results?search_query=proper+form+face+pulls" },
  { name: "Straight Arm Pulldown", target: "Back", video: "https://www.youtube.com/results?search_query=proper+form+straight+arm+pulldown" },

  // --- LEGS ---
  { name: "Barbell Back Squat", target: "Legs", video: "https://www.youtube.com/results?search_query=proper+form+barbell+back+squat" },
  { name: "Leg Press", target: "Legs", video: "https://www.youtube.com/results?search_query=proper+form+leg+press" },
  { name: "Romanian Deadlift (RDL)", target: "Legs", video: "https://www.youtube.com/results?search_query=proper+form+romanian+deadlift" },
  { name: "Bulgarian Split Squat", target: "Legs", video: "https://www.youtube.com/results?search_query=proper+form+bulgarian+split+squat" },
  { name: "Leg Extensions", target: "Legs", video: "https://www.youtube.com/results?search_query=proper+form+leg+extensions" },
  { name: "Lying Leg Curls", target: "Legs", video: "https://www.youtube.com/results?search_query=proper+form+lying+leg+curls" },
  { name: "Seated Leg Curls", target: "Legs", video: "https://www.youtube.com/results?search_query=proper+form+seated+leg+curls" },
  { name: "Standing Calf Raises", target: "Legs", video: "https://www.youtube.com/results?search_query=proper+form+standing+calf+raises" },
  { name: "Seated Calf Raises", target: "Legs", video: "https://www.youtube.com/results?search_query=proper+form+seated+calf+raises" },
  { name: "Walking Lunges", target: "Legs", video: "https://www.youtube.com/results?search_query=proper+form+walking+lunges" },
  { name: "Front Squat", target: "Legs", video: "https://www.youtube.com/results?search_query=proper+form+front+squat" },
  { name: "Barbell Hip Thrusts", target: "Legs", video: "https://www.youtube.com/results?search_query=proper+form+barbell+hip+thrusts" },

  // --- SHOULDERS ---
  { name: "Overhead Barbell Press", target: "Shoulders", video: "https://www.youtube.com/results?search_query=proper+form+overhead+barbell+press" },
  { name: "Seated Dumbbell Press", target: "Shoulders", video: "https://www.youtube.com/results?search_query=proper+form+seated+dumbbell+press" },
  { name: "Dumbbell Lateral Raises", target: "Shoulders", video: "https://www.youtube.com/results?search_query=proper+form+dumbbell+lateral+raises" },
  { name: "Cable Lateral Raises", target: "Shoulders", video: "https://www.youtube.com/results?search_query=proper+form+cable+lateral+raises" },
  { name: "Dumbbell Front Raises", target: "Shoulders", video: "https://www.youtube.com/results?search_query=proper+form+dumbbell+front+raises" },
  { name: "Reverse Pec Deck", target: "Shoulders", video: "https://www.youtube.com/results?search_query=proper+form+reverse+pec+deck" },
  { name: "Arnold Press", target: "Shoulders", video: "https://www.youtube.com/results?search_query=proper+form+arnold+press" },

  // --- ARMS (BICEPS / TRICEPS / FOREARMS) ---
  { name: "Barbell Bicep Curl", target: "Arms", video: "https://www.youtube.com/results?search_query=proper+form+barbell+bicep+curl" },
  { name: "Dumbbell Hammer Curl", target: "Arms", video: "https://www.youtube.com/results?search_query=proper+form+dumbbell+hammer+curl" },
  { name: "Incline Dumbbell Curl", target: "Arms", video: "https://www.youtube.com/results?search_query=proper+form+incline+dumbbell+curl" },
  { name: "EZ Bar Preacher Curl", target: "Arms", video: "https://www.youtube.com/results?search_query=proper+form+ez+bar+preacher+curl" },
  { name: "Cable Tricep Pushdown", target: "Arms", video: "https://www.youtube.com/results?search_query=proper+form+cable+tricep+pushdown" },
  { name: "Overhead Tricep Extension", target: "Arms", video: "https://www.youtube.com/results?search_query=proper+form+overhead+tricep+extension" },
  { name: "EZ Bar Skull Crushers", target: "Arms", video: "https://www.youtube.com/results?search_query=proper+form+ez+bar+skull+crushers" },
  { name: "Tricep Dips", target: "Arms", video: "https://www.youtube.com/results?search_query=proper+form+tricep+dips" },

  // --- CORE ---
  { name: "Forearm Plank", target: "Core", video: "https://www.youtube.com/results?search_query=proper+form+forearm+plank" },
  { name: "Hanging Leg Raises", target: "Core", video: "https://www.youtube.com/results?search_query=proper+form+hanging+leg+raises" },
  { name: "Cable Crunches", target: "Core", video: "https://www.youtube.com/results?search_query=proper+form+cable+crunches" },
  { name: "Ab Wheel Rollout", target: "Core", video: "https://www.youtube.com/results?search_query=proper+form+ab+wheel+rollout" }
];
