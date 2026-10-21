<script setup lang="ts">
/**
 * Иллюстрация товара: вид сверху на чашку / стакан / тарелку.
 * Если у товара есть image_url — показываем фото, иначе рисуем по slug.
 */
import { computed } from 'vue'

const props = withDefaults(defineProps<{ slug: string; imageUrl?: string | null; size?: number; tile?: boolean; category?: string | null }>(), {
  category: null,
  imageUrl: null,
  size: 120,
  tile: true,
})

type Kind =
  | 'cup' | 'small' | 'glass' | 'juice' | 'shake' | 'smoothie' | 'croissant' | 'cinnabon' | 'cake' | 'square' | 'macaron' | 'plate' | 'bowl'
  | 'eclair' | 'donut' | 'cookie' | 'muffin' | 'waffle' | 'blini' | 'icecream' | 'sandwich'
type Art = 'none' | 'heart' | 'tulip' | 'rosetta' | 'ring' | 'specks' | 'swirl' | 'marsh' | 'leaf' | 'drizzle' | 'flakes' | 'lemon' | 'flower' | 'berry' | 'mint' | 'scoop'
interface Spec {
  kind: Kind
  liquid?: string
  foam?: string
  art?: Art
  tone: string // фон плитки
  extra?: string
  fill?: string // начинка / верх десерта
  crust?: string
  style?: string
}

const SPECS: Record<string, Spec> = {
  espresso: { kind: 'small', liquid: '#5a3216', foam: '#a8682f', art: 'ring', tone: '#e9dccb' },
  americano: { kind: 'cup', liquid: '#3b220f', foam: '#6b3d1c', art: 'ring', tone: '#e4d9cc' },
  cappuccino: { kind: 'cup', liquid: '#8a5428', foam: '#f3e6d2', art: 'heart', tone: '#efe1cf' },
  'flat-white': { kind: 'cup', liquid: '#7a4620', foam: '#ecd9bf', art: 'tulip', tone: '#eadbc6' },
  latte: { kind: 'cup', liquid: '#a46a37', foam: '#f6ead9', art: 'rosetta', tone: '#f1e5d5' },
  raf: { kind: 'cup', liquid: '#e9d5b5', foam: '#f8eedf', art: 'specks', tone: '#f4ead8' },
  'raf-lavender': { kind: 'cup', liquid: '#c9b6dd', foam: '#efe6f6', art: 'specks', tone: '#e6dcef', extra: '#8f74b5' },
  mocha: { kind: 'cup', liquid: '#5b311a', foam: '#c99d78', art: 'swirl', tone: '#e7d6c6' },
  cortado: { kind: 'small', liquid: '#9a5f2e', foam: '#e8d2b4', art: 'heart', tone: '#ecdccb' },
  cocoa: { kind: 'cup', liquid: '#7b4527', foam: '#a3694a', art: 'marsh', tone: '#ead8ca' },
  matcha: { kind: 'cup', liquid: '#7da35a', foam: '#d7e6bf', art: 'heart', tone: '#dfe8d0' },
  'hot-chocolate': { kind: 'small', liquid: '#3d1d0e', foam: '#5e2f17', art: 'swirl', tone: '#e3d2c4' },
  'iced-latte': { kind: 'glass', liquid: '#c99b6b', foam: '#efe0cc', tone: '#e3e6df' },
  'espresso-tonic': { kind: 'glass', liquid: '#c98a3a', foam: '#6a3a15', tone: '#e6e3d7' },
  'cold-brew': { kind: 'glass', liquid: '#3a2111', foam: '#5a3418', tone: '#dfe1db' },
  lemonade: { kind: 'glass', liquid: '#f2a43a', foam: '#f7c56e', tone: '#f3e6cf', extra: '#5f8a4c' },
  'tea-pot': { kind: 'cup', liquid: '#b5651d', foam: '#c97a2e', art: 'leaf', tone: '#ece0cf' },
  'tea-black': { kind: 'cup', liquid: '#9a4a12', foam: '#b8621f', art: 'leaf', tone: '#ece0cf' },
  'tea-green': { kind: 'cup', liquid: '#b7b04a', foam: '#cfc76a', art: 'leaf', tone: '#e7e8d2' },
  masala: { kind: 'cup', liquid: '#c58a55', foam: '#e7c9a4', art: 'specks', tone: '#efe0cd', extra: '#6b3a16' },
  'lemonade-strawberry': { kind: 'glass', liquid: '#e2546a', foam: '#f39aa6', tone: '#f4dfe0', extra: '#4f8a3c' },
  'lemonade-mango': { kind: 'glass', liquid: '#f3a12b', foam: '#f9c95e', tone: '#f6e6c8', extra: '#5f8a4c' },
  'lemonade-citrus': { kind: 'glass', liquid: '#e7d84f', foam: '#f4ec9a', tone: '#eef0d4', extra: '#3f8a4a' },
  'juice-orange': { kind: 'juice', liquid: '#f39324', foam: '#f7b24e', tone: '#f7e5cc', extra: '#f6a531' },
  'juice-apple': { kind: 'juice', liquid: '#d8c25a', foam: '#e8d982', tone: '#eef0d2', extra: '#8cc152' },
  'juice-grapefruit': { kind: 'juice', liquid: '#ec6f5c', foam: '#f39a86', tone: '#f6dfd8', extra: '#f08a73' },
  'juice-carrot': { kind: 'juice', liquid: '#ee7a22', foam: '#f39c4e', tone: '#f6e1cc', extra: '#e8a23b' },
  'shake-vanilla': { kind: 'shake', liquid: '#f3e3bf', foam: '#fffaf0', tone: '#f5ecd8', extra: '#c9a25a' },
  'shake-chocolate': { kind: 'shake', liquid: '#7a4a2a', foam: '#fff6ea', tone: '#ead9cb', extra: '#3e2111' },
  'shake-strawberry': { kind: 'shake', liquid: '#f1a3b0', foam: '#fff5f6', tone: '#f6e0e3', extra: '#d2412f' },
  'shake-banana': { kind: 'shake', liquid: '#f2d67a', foam: '#fffbea', tone: '#f6ecd0', extra: '#8a5a2b' },
  tiramisu: { kind: 'square', tone: '#eee2d2', style: 'tiramisu' },
  brownie: { kind: 'square', tone: '#e8dacc', style: 'brownie' },
  medovik: { kind: 'cake', tone: '#f1e3c9', fill: '#e8b15c', crust: '#b8742c', style: 'medovik' },
  macarons: { kind: 'macaron', tone: '#efe4e6' },
  'sea-buckthorn': { kind: 'cup', liquid: '#ef8a1e', foam: '#f6b04f', art: 'specks', tone: '#f4e3cc', extra: '#c4580c' },
  croissant: { kind: 'croissant', tone: '#f2e3c7' },
  'almond-croissant': { kind: 'croissant', tone: '#efe0c8', extra: 'almond' },
  cinnabon: { kind: 'cinnabon', tone: '#f0e2cf' },
  cheesecake: { kind: 'cake', tone: '#f3ead6' },
  syrniki: { kind: 'plate', tone: '#efe4d3' },
  granola: { kind: 'bowl', tone: '#e9e4d6' },
  // ---------- кофе: вкусы ----------
  macchiato: { kind: 'small', liquid: '#5a3216', foam: '#f3e6d2', art: 'heart', tone: '#eadccb' },
  affogato: { kind: 'small', liquid: '#3b220f', foam: '#f8f0e2', art: 'scoop', tone: '#e7dccd' },
  'raf-caramel': { kind: 'cup', liquid: '#e2c08f', foam: '#f6e7cf', art: 'drizzle', extra: '#b8732e', tone: '#f2e4cf' },
  'raf-coconut': { kind: 'cup', liquid: '#efe3cf', foam: '#fbf6ec', art: 'flakes', tone: '#f1ece2' },
  'raf-honey': { kind: 'cup', liquid: '#ead09a', foam: '#f8ecd2', art: 'drizzle', extra: '#d99a2b', tone: '#f4e6c8' },
  'raf-citrus': { kind: 'cup', liquid: '#efd9a8', foam: '#f9eed6', art: 'lemon', tone: '#f4ead2' },
  'raf-halva': { kind: 'cup', liquid: '#e3cfae', foam: '#f5ead6', art: 'specks', extra: '#9a7448', tone: '#efe3cf' },
  'raf-pistachio': { kind: 'cup', liquid: '#d6dcae', foam: '#eef1d9', art: 'specks', extra: '#6f8a3a', tone: '#e8ead6' },
  'raf-vanilla': { kind: 'cup', liquid: '#efdcb8', foam: '#fbf3e3', art: 'specks', extra: '#3a2414', tone: '#f4ead6' },
  'latte-caramel': { kind: 'cup', liquid: '#b8783e', foam: '#f4e3c9', art: 'drizzle', extra: '#8a4f1c', tone: '#f0e0cb' },
  'latte-vanilla': { kind: 'cup', liquid: '#c79a68', foam: '#f7eedf', art: 'rosetta', tone: '#f2e7d6' },
  'latte-coconut': { kind: 'cup', liquid: '#c8a27a', foam: '#fbf5ea', art: 'flakes', tone: '#efe6da' },
  'latte-pumpkin': { kind: 'cup', liquid: '#c97a3a', foam: '#f3dcc0', art: 'specks', extra: '#8a4a1c', tone: '#f2dfc8' },
  'latte-lavender': { kind: 'cup', liquid: '#b9a2c9', foam: '#efe6f4', art: 'rosetta', tone: '#e7deef' },
  'latte-banana': { kind: 'cup', liquid: '#d9b46a', foam: '#f8eccd', art: 'rosetta', tone: '#f3e8cc' },
  'latte-nut': { kind: 'cup', liquid: '#a8754a', foam: '#f1e2cd', art: 'specks', extra: '#6b4223', tone: '#ecdccb' },
  'latte-honey': { kind: 'cup', liquid: '#c9924a', foam: '#f6e6c6', art: 'drizzle', extra: '#d99a2b', tone: '#f1e2c8' },
  'latte-cinnamon': { kind: 'cup', liquid: '#a96d3d', foam: '#f2e2cc', art: 'specks', extra: '#7a3f17', tone: '#ecdccb' },
  'latte-gingerbread': { kind: 'cup', liquid: '#9c6436', foam: '#efdcc3', art: 'specks', extra: '#5e2f14', tone: '#ead8c4' },
  'latte-halva': { kind: 'cup', liquid: '#b58a5e', foam: '#f1e3cf', art: 'specks', extra: '#7a5a38', tone: '#ece0cf' },
  'latte-pistachio': { kind: 'cup', liquid: '#a9b07a', foam: '#eef0dc', art: 'rosetta', tone: '#e6e8d4' },
  'latte-maple': { kind: 'cup', liquid: '#b07034', foam: '#f3e1c6', art: 'drizzle', extra: '#7a3f12', tone: '#efdec8' },
  'latte-salted-caramel': { kind: 'cup', liquid: '#b07a46', foam: '#f4e4cc', art: 'drizzle', extra: '#6e3a12', tone: '#efe0cb' },
  'latte-chocolate': { kind: 'cup', liquid: '#7a4a2a', foam: '#ecd8c2', art: 'swirl', tone: '#e8d6c6' },
  'hot-chocolate-white': { kind: 'small', liquid: '#efe2c8', foam: '#d9c4a0', art: 'swirl', tone: '#f2ead8' },
  bumble: { kind: 'glass', liquid: '#f39324', foam: '#3b220f', tone: '#f4e3cc' },
  'iced-americano': { kind: 'glass', liquid: '#2e1a0c', foam: '#4a2a14', tone: '#dfe1db' },
  'iced-raf': { kind: 'glass', liquid: '#e2cfae', foam: '#f6ecd8', tone: '#ece7da' },
  'iced-matcha': { kind: 'glass', liquid: '#8fb562', foam: '#d7e6bf', tone: '#e0e9d4' },
  'iced-cocoa': { kind: 'glass', liquid: '#7b4527', foam: '#a3694a', tone: '#e6dad0' },
  frappe: { kind: 'shake', liquid: '#b07a4a', foam: '#fff6ea', tone: '#ecdccb', extra: '#5e3418' },
  // ---------- чай ----------
  'tea-oolong': { kind: 'cup', liquid: '#c58a2e', foam: '#d9a24a', art: 'leaf', tone: '#efe2c8' },
  'tea-puer': { kind: 'cup', liquid: '#4a200b', foam: '#6a3014', art: 'leaf', tone: '#e4d6c8' },
  'tea-hibiscus': { kind: 'cup', liquid: '#b3243a', foam: '#d0485c', art: 'flower', extra: '#f3a6b4', tone: '#f2d9dc' },
  'tea-herbal': { kind: 'cup', liquid: '#d7b25a', foam: '#e6c878', art: 'flower', extra: '#ffffff', tone: '#efe8cf' },
  'tea-jasmine': { kind: 'cup', liquid: '#c9c27a', foam: '#ddd79a', art: 'flower', extra: '#ffffff', tone: '#ecebd4' },
  'tea-ivan': { kind: 'cup', liquid: '#b8702e', foam: '#cc8a44', art: 'leaf', tone: '#eee0cb' },
  'tea-mate': { kind: 'cup', liquid: '#8aa04a', foam: '#a8b964', art: 'leaf', tone: '#e3e8cf' },
  'tea-rooibos': { kind: 'cup', liquid: '#c4561e', foam: '#d8743a', art: 'leaf', tone: '#f1dccb' },
  'tea-earl': { kind: 'cup', liquid: '#8a4010', foam: '#a85a20', art: 'lemon', tone: '#ece0cf' },
  'tea-lemon': { kind: 'cup', liquid: '#a9561a', foam: '#c06e2c', art: 'lemon', tone: '#efe3cc' },
  'tea-ginger': { kind: 'cup', liquid: '#d1a245', foam: '#e2bd6a', art: 'lemon', tone: '#f1e6c8' },
  'tea-berry': { kind: 'cup', liquid: '#9a2a4a', foam: '#b8486a', art: 'berry', tone: '#f0d9e0' },
  'tea-mint': { kind: 'cup', liquid: '#b9b04a', foam: '#ccc56a', art: 'mint', tone: '#e7e8d2' },
  'tea-white': { kind: 'cup', liquid: '#e3d7a0', foam: '#eee5bb', art: 'leaf', tone: '#f1eedb' },
  'tea-milk': { kind: 'cup', liquid: '#d9b98a', foam: '#ecd8b8', art: 'leaf', tone: '#f1e6d4' },
  // ---------- лимонады ----------
  'lemonade-tarragon': { kind: 'glass', liquid: '#7cc46a', foam: '#b9e3a6', tone: '#dfeed6', extra: '#3f7a3a' },
  'lemonade-mojito': { kind: 'glass', liquid: '#d6ecc0', foam: '#f1f8e6', tone: '#e4f0dc', extra: '#3f8a4a' },
  'lemonade-passion': { kind: 'glass', liquid: '#f2c12e', foam: '#f8db7a', tone: '#f6ecc8', extra: '#5f8a4c' },
  'lemonade-cherry': { kind: 'glass', liquid: '#a3182f', foam: '#cf4a5e', tone: '#f2d8dc', extra: '#4f8a3c' },
  'lemonade-raspberry': { kind: 'glass', liquid: '#d93a6a', foam: '#ef7fa0', tone: '#f6dce4', extra: '#4f8a3c' },
  'lemonade-blueberry': { kind: 'glass', liquid: '#5b3f8f', foam: '#8a72bf', tone: '#e2dcef', extra: '#4f8a3c' },
  'lemonade-watermelon': { kind: 'glass', liquid: '#f26a7a', foam: '#f8a5ae', tone: '#f7dfe1', extra: '#3f8a4a' },
  'lemonade-cucumber': { kind: 'glass', liquid: '#bfe0a2', foam: '#e1f0cf', tone: '#e3efd8', extra: '#3f8a4a' },
  'lemonade-pineapple': { kind: 'glass', liquid: '#f3d24a', foam: '#f8e48a', tone: '#f6efcc', extra: '#5f8a4c' },
  'lemonade-grapefruit': { kind: 'glass', liquid: '#f07a6a', foam: '#f6a99c', tone: '#f7e0db', extra: '#4f8a3c' },
  'lemonade-ginger': { kind: 'glass', liquid: '#e9c86a', foam: '#f3dd9c', tone: '#f5ecd0', extra: '#5f8a4c' },
  'lemonade-berry': { kind: 'glass', liquid: '#b03060', foam: '#d4607f', tone: '#f2d9e1', extra: '#4f8a3c' },
  'lemonade-pomegranate': { kind: 'glass', liquid: '#b5122e', foam: '#d94a5e', tone: '#f2d6da', extra: '#4f8a3c' },
  'lemonade-orange': { kind: 'glass', liquid: '#f39324', foam: '#f7b24e', tone: '#f6e3cc', extra: '#5f8a4c' },
  'lemonade-lavender': { kind: 'glass', liquid: '#b9a2d9', foam: '#dccdf0', tone: '#e8e0f2', extra: '#6a8a4c' },
  'lemonade-peach': { kind: 'glass', liquid: '#f6b07a', foam: '#f9cfa8', tone: '#f8e4d2', extra: '#5f8a4c' },
  'lemonade-kiwi': { kind: 'glass', liquid: '#9ccc4a', foam: '#c5e28a', tone: '#e6f0d2', extra: '#3f7a3a' },
  // ---------- соки ----------
  'juice-cherry': { kind: 'juice', liquid: '#8e1430', foam: '#b8364e', tone: '#f2d6dc', extra: '#c2273d' },
  'juice-pineapple': { kind: 'juice', liquid: '#f2cf3a', foam: '#f7e17e', tone: '#f6eecc', extra: '#f5d33f' },
  'juice-tomato': { kind: 'juice', liquid: '#c8321e', foam: '#de5a3e', tone: '#f4dad3', extra: '#e0432a' },
  'juice-pomegranate': { kind: 'juice', liquid: '#a5112b', foam: '#cf3a52', tone: '#f2d4d9', extra: '#c81e3a' },
  'juice-grape': { kind: 'juice', liquid: '#6a1f4a', foam: '#8e3e6a', tone: '#ebd9e3', extra: '#7a2a5a' },
  'juice-multifruit': { kind: 'juice', liquid: '#f2a33a', foam: '#f7c26e', tone: '#f6e5cc', extra: '#e8692a' },
  'juice-peach': { kind: 'juice', liquid: '#f5a96a', foam: '#f8c79a', tone: '#f8e4d4', extra: '#f39b5a' },
  'juice-mango': { kind: 'juice', liquid: '#f3a51c', foam: '#f8c858', tone: '#f7e7c8', extra: '#f0a020' },
  'juice-green': { kind: 'juice', liquid: '#9cc35a', foam: '#bdd88a', tone: '#e5efd4', extra: '#7aa83a' },
  'juice-beet': { kind: 'juice', liquid: '#8e1a3e', foam: '#b03a5e', tone: '#efd5de', extra: '#a32350' },
  'juice-lemon': { kind: 'juice', liquid: '#f2e06a', foam: '#f7ec9e', tone: '#f6f2d2', extra: '#f2d43a' },
  // ---------- молочные коктейли ----------
  'shake-caramel': { kind: 'shake', liquid: '#d9a35a', foam: '#fff8ec', tone: '#f4e4cc', extra: '#9a5a1c' },
  'shake-coffee': { kind: 'shake', liquid: '#a8784e', foam: '#fff6ea', tone: '#ecdccb', extra: '#4a2a14' },
  'shake-mint': { kind: 'shake', liquid: '#bfe3c6', foam: '#f6fff8', tone: '#e0f0e2', extra: '#3e2111' },
  'shake-blueberry': { kind: 'shake', liquid: '#a99ad6', foam: '#f8f5ff', tone: '#e6e0f3', extra: '#3e4f8f' },
  'shake-raspberry': { kind: 'shake', liquid: '#ec8fb0', foam: '#fff5f8', tone: '#f6dde6', extra: '#c2384f' },
  'shake-cookies': { kind: 'shake', liquid: '#d6d0c6', foam: '#ffffff', tone: '#ebe8e2', extra: '#2a1d16' },
  'shake-peanut': { kind: 'shake', liquid: '#d8b27a', foam: '#fff8ec', tone: '#f2e6d0', extra: '#8a5a2b' },
  'shake-pistachio': { kind: 'shake', liquid: '#c8d8a0', foam: '#fbfff2', tone: '#e7eed6', extra: '#6f8a3a' },
  'shake-coconut': { kind: 'shake', liquid: '#f3ece0', foam: '#ffffff', tone: '#f1ede4', extra: '#c9b89a' },
  'shake-mango': { kind: 'shake', liquid: '#f6c25a', foam: '#fffaf0', tone: '#f7e9cc', extra: '#e88a1a' },
  'shake-cherry': { kind: 'shake', liquid: '#e48aa0', foam: '#fff5f6', tone: '#f5dde3', extra: '#a3182f' },
  // ---------- смузи ----------
  'smoothie-berry': { kind: 'smoothie', liquid: '#a8325a', foam: '#c85a7e', tone: '#f2dce4', style: 'berry' },
  'smoothie-strawberry-banana': { kind: 'smoothie', liquid: '#f28aa0', foam: '#f8b8c4', tone: '#f7e0e4', style: 'banana' },
  'smoothie-mango': { kind: 'smoothie', liquid: '#f6a623', foam: '#f9c867', tone: '#f7e6c8', style: 'mango' },
  'smoothie-green': { kind: 'smoothie', liquid: '#8fbf4a', foam: '#b5d77e', tone: '#e3eed2', style: 'kiwi' },
  'smoothie-blueberry': { kind: 'smoothie', liquid: '#5a4a9a', foam: '#8a7ac4', tone: '#e2def0', style: 'berry' },
  'smoothie-banana': { kind: 'smoothie', liquid: '#f2dc8a', foam: '#f9ecb8', tone: '#f6efd2', style: 'banana' },
  'smoothie-peach': { kind: 'smoothie', liquid: '#f7b27a', foam: '#fad0a8', tone: '#f8e5d4', style: 'mango' },
  'smoothie-raspberry': { kind: 'smoothie', liquid: '#d93a6a', foam: '#ef7fa0', tone: '#f6dce4', style: 'berry' },
  'smoothie-cherry': { kind: 'smoothie', liquid: '#9e1a3a', foam: '#c8486a', tone: '#f0d6dc', style: 'berry' },
  'smoothie-oat': { kind: 'smoothie', liquid: '#e8d2a8', foam: '#f4e6c8', tone: '#f3ead8', style: 'banana' },
  // ---------- десерты и еда ----------
  'cheesecake-choco': { kind: 'cake', tone: '#eadbcd', fill: '#5a3018', crust: '#2e170b', style: 'choco' },
  'cheesecake-caramel': { kind: 'cake', tone: '#f2e4cc', fill: '#f1dcae', crust: '#b8742c', style: 'caramel' },
  'cheesecake-lemon': { kind: 'cake', tone: '#f4efd2', fill: '#f6e7a8', crust: '#c48a4a', style: 'lemon' },
  napoleon: { kind: 'cake', tone: '#f2e6cf', fill: '#f4e6c4', crust: '#d9a65a', style: 'layers' },
  'red-velvet': { kind: 'cake', tone: '#f2dcdc', fill: '#b8293a', crust: '#f4ece2', style: 'velvet' },
  'carrot-cake': { kind: 'cake', tone: '#f3e3cf', fill: '#e09a4e', crust: '#f4ece2', style: 'carrot' },
  'choco-cake': { kind: 'cake', tone: '#e6d6c8', fill: '#4a2614', crust: '#2e170b', style: 'choco' },
  pie: { kind: 'cake', tone: '#f2e3c9', fill: '#e8b56a', crust: '#c4823a', style: 'pie' },
  'lemon-tart': { kind: 'cake', tone: '#f5efcf', fill: '#f5dc6a', crust: '#d39a4a', style: 'lemon' },
  'croissant-choco': { kind: 'croissant', tone: '#efe0c8', extra: 'choco' },
  eclair: { kind: 'eclair', tone: '#ecdccb', fill: '#4a2614' },
  'eclair-vanilla': { kind: 'eclair', tone: '#f2e8d4', fill: '#f3e2bf' },
  'eclair-pistachio': { kind: 'eclair', tone: '#e8ecd6', fill: '#b9cc8a' },
  donut: { kind: 'donut', tone: '#f6dfe6', fill: '#e98aa0' },
  'donut-choco': { kind: 'donut', tone: '#ead9cc', fill: '#4a2614' },
  'donut-vanilla': { kind: 'donut', tone: '#f3ead8', fill: '#fbf2df' },
  cookie: { kind: 'cookie', tone: '#f1e3cc' },
  muffin: { kind: 'muffin', tone: '#f0e2cf', fill: '#c98a4a', extra: '#3e4f8f' },
  'muffin-choco': { kind: 'muffin', tone: '#e8d8ca', fill: '#5a3018', extra: '#2e170b' },
  cupcake: { kind: 'muffin', tone: '#f6e0e6', fill: '#c98a4a', extra: '#f4b6c6', style: 'cream' },
  waffle: { kind: 'waffle', tone: '#f2e3c7' },
  blini: { kind: 'blini', tone: '#f2e6cf' },
  icecream: { kind: 'icecream', tone: '#f3e8e8', fill: '#f6ead2', extra: '#e98aa0', crust: '#6b3a1f' },
  sandwich: { kind: 'sandwich', tone: '#eee6d4' },
}

const FALLBACK: Spec = { kind: 'cup', liquid: '#8a5428', foam: '#efe0cc', art: 'heart', tone: '#ece2d4' }

// slug собирается из русского названия транслитом («Круассан» → kruassan), поэтому узнаём товар по корням слов
type Rule = [string[], string]
function guess(text: string): string | null {
  const s = text.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const words = s.split('-').filter(Boolean)
  const has = (...keys: string[]) => keys.some((k) => s.includes(k))
  const word = (...keys: string[]) => words.some((w) => keys.some((k) => w.startsWith(k)))
  const pick = (rules: Rule[], fallback: string) => rules.find(([keys]) => has(...keys))?.[1] ?? fallback

  // смузи — раньше соков и коктейлей
  if (word('smuzi', 'smoothie', 'smuzy', 'smusi')) {
    if (has('klubni', 'strawberr') && has('banan')) return 'smoothie-strawberry-banana'
    return pick([[['chernik', 'chernich', 'golubik', 'bluebe'], 'smoothie-blueberry'], [['malin', 'raspberr'], 'smoothie-raspberry'], [['vishn', 'cherry'], 'smoothie-cherry'], [['klubni', 'strawberr', 'yagod', 'berry', 'smorod', 'ezhevik'], 'smoothie-berry'], [['mango', 'tropik', 'tropic', 'ananas', 'marakuy'], 'smoothie-mango'], [['persik', 'peach', 'abrikos'], 'smoothie-peach'], [['zelen', 'green', 'shpinat', 'spinach', 'kivi', 'kiwi', 'avokado', 'avocado', 'selder'], 'smoothie-green'], [['ovsyan', 'oat', 'granol'], 'smoothie-oat'], [['banan'], 'smoothie-banana']], 'smoothie-berry')
  }

  // выпечка и десерты
  if (has('croissant', 'kruas')) return has('almond', 'mindal') ? 'almond-croissant' : has('shokolad', 'choco') ? 'croissant-choco' : 'croissant'
  if (has('cinnabon', 'sinnabon', 'bulochk', 'bulka', 'ulitk') || word('bun')) return 'cinnabon'
  if (has('cheesecake', 'chizk')) return pick([[['shokolad', 'choco'], 'cheesecake-choco'], [['karamel', 'caramel'], 'cheesecake-caramel'], [['limon', 'lemon'], 'cheesecake-lemon']], 'cheesecake')
  if (has('tiramisu')) return 'tiramisu'
  if (has('brownie', 'brauni', 'fondan')) return 'brownie'
  if (has('macaron', 'makaron')) return 'macarons'
  if (has('syrnik', 'sirnik')) return 'syrniki'
  if (has('ekler', 'eclair')) return pick([[['vanil'], 'eclair-vanilla'], [['fistash', 'pistach', 'pistash'], 'eclair-pistachio']], 'eclair')
  if (has('ponch', 'donut', 'doughnut', 'pyshk', 'berliner')) return pick([[['shokolad', 'choco'], 'donut-choco'], [['vanil', 'sahar'], 'donut-vanilla']], 'donut')
  if (has('kapkeyk', 'cupcake')) return 'cupcake'
  if (has('maffin', 'muffin', 'keks')) return has('shokolad', 'choco') ? 'muffin-choco' : 'muffin'
  if (has('pechen', 'cookie', 'kuki', 'biskvit')) return 'cookie'
  if (has('vafl', 'waffle')) return 'waffle'
  if (has('blin', 'pancake', 'oladi', 'oladya', 'krep', 'crepe')) return 'blini'
  if (has('morozhen', 'ice-cream', 'icecream', 'plombir', 'dzhelato', 'gelato', 'sorbet', 'pannakot', 'panna-kot', 'panna-cot', 'pavlov', 'mussh', 'mousse')) return 'icecream'
  if (has('sendvich', 'sandwich', 'panini', 'buter', 'klab', 'wrap', 'shaurm', 'bagel', 'beygl', 'tost', 'toast')) return 'sandwich'
  if (has('granola', 'ovsyan', 'porridge', 'yogurt', 'yogur', 'parfe') || word('kasha')) return 'granola'
  if (has('napoleon')) return 'napoleon'
  if (has('krasnyy-barhat', 'red-velvet', 'barhat')) return 'red-velvet'
  if (has('morkovn-tort', 'carrot-cake') || (has('morkov') && word('tort', 'keyk', 'cake'))) return 'carrot-cake'
  if (has('tart', 'tartalet') && has('limon', 'lemon')) return 'lemon-tart'
  if (has('pirog', 'sharlot', 'shtrudel', 'strudel', 'tart', 'pie', 'kish', 'quiche', 'galet')) return 'pie'
  if (has('medovik')) return 'medovik'
  if ((word('tort', 'keyk', 'cake') && has('shokolad', 'choco')) || has('pirozhnoe-kartoshka', 'kartoshka')) return 'choco-cake'
  if (has('vypech', 'bakery', 'hleb', 'bread')) return 'croissant'
  if (has('zavtrak', 'breakfast')) return 'syrniki'
  if (word('eda', 'food', 'snek', 'snack', 'zakusk')) return 'sandwich'
  if (has('pirozh', 'desert', 'dessert', 'trubochk', 'meringue', 'bezeshk', 'zefir', 'pastil', 'marmelad') || word('tort', 'cake', 'keyk')) return 'medovik'

  // молочные коктейли
  if (has('shake', 'kokteyl', 'koktejl', 'kokteil', 'molochn', 'milksh') && !word('ulun', 'oolong', 'chay', 'chai', 'tea', 'puer')) {
    return pick([[['shokolad', 'choco'], 'shake-chocolate'], [['karamel', 'caramel', 'iris'], 'shake-caramel'], [['kofe', 'coffee', 'espresso'], 'shake-coffee'], [['myat', 'mint'], 'shake-mint'], [['chernik', 'chernich', 'golubik', 'bluebe'], 'shake-blueberry'], [['malin', 'raspberr'], 'shake-raspberry'], [['vishn', 'cherry'], 'shake-cherry'], [['klubni', 'strawberr'], 'shake-strawberry'], [['banan'], 'shake-banana'], [['oreo', 'pechen', 'cookie'], 'shake-cookies'], [['arahis', 'peanut', 'snikers', 'snickers'], 'shake-peanut'], [['fistash', 'pistach', 'pistash'], 'shake-pistachio'], [['kokos', 'coconut', 'baunti', 'bounty'], 'shake-coconut'], [['mango'], 'shake-mango']], 'shake-vanilla')
  }

  // лимонады
  if (has('limonad', 'lemonade', 'mohito', 'mojito', 'tarhun', 'tarragon')) {
    return pick([[['tarhun', 'tarragon'], 'lemonade-tarragon'], [['mohito', 'mojito'], 'lemonade-mojito'], [['marakuy', 'passion'], 'lemonade-passion'], [['arbuz', 'watermelon'], 'lemonade-watermelon'], [['ogur', 'cucumber'], 'lemonade-cucumber'], [['ananas', 'pineapple'], 'lemonade-pineapple'], [['greypf', 'greipf', 'grapefr'], 'lemonade-grapefruit'], [['imbir', 'ginger'], 'lemonade-ginger'], [['granat', 'pomegran'], 'lemonade-pomegranate'], [['lavand', 'lavender'], 'lemonade-lavender'], [['persik', 'peach'], 'lemonade-peach'], [['kivi', 'kiwi'], 'lemonade-kiwi'], [['apelsin', 'orange'], 'lemonade-orange'], [['chernik', 'chernich', 'golubik', 'bluebe'], 'lemonade-blueberry'], [['malin', 'raspberr'], 'lemonade-raspberry'], [['vishn', 'cherry'], 'lemonade-cherry'], [['klubni', 'strawberr'], 'lemonade-strawberry'], [['yagod', 'berry', 'smorod', 'klukv', 'brusnik'], 'lemonade-berry'], [['mango'], 'lemonade-mango'], [['citrus', 'cytrus', 'limon', 'lemon', 'laym', 'lime'], 'lemonade-citrus']], 'lemonade')
  }

  // соки и фреши
  if (word('sok', 'soki', 'juice', 'fresh', 'nektar', 'nectar', 'mors')) {
    return pick([[['yabl', 'apple'], 'juice-apple'], [['greypf', 'greipf', 'grapefr'], 'juice-grapefruit'], [['morkov', 'carrot'], 'juice-carrot'], [['vishn', 'cherry', 'klukv', 'mors'], 'juice-cherry'], [['ananas', 'pineapple'], 'juice-pineapple'], [['tomat', 'tomato'], 'juice-tomato'], [['granat', 'pomegran'], 'juice-pomegranate'], [['vinograd', 'grape'], 'juice-grape'], [['multifrukt', 'multi'], 'juice-multifruit'], [['persik', 'peach', 'abrikos'], 'juice-peach'], [['mango'], 'juice-mango'], [['selder', 'zelen', 'green', 'shpinat', 'ogur'], 'juice-green'], [['svek', 'beet'], 'juice-beet'], [['limon', 'lemon'], 'juice-lemon']], 'juice-orange')
  }

  // чай
  if (has('oblepih', 'buckthorn')) return 'sea-buckthorn'
  if (has('masala')) return 'masala'
  if (has('matcha', 'macha')) return has('ays', 'iced', 'holodn') || word('ice') ? 'iced-matcha' : 'matcha'
  if (word('chay', 'chai', 'tea', 'ulun', 'oolong', 'puer', 'mate', 'roybush', 'rooibos', 'karkade', 'hibisk', 'travyan', 'sencha', 'gyokuro', 'tegua', 'dahun', 'earl', 'erl', 'zhasmin', 'jasmin', 'chabrec', 'tsvetoch', 'romashk')) {
    return pick([[['ulun', 'oolong'], 'tea-oolong'], [['puer'], 'tea-puer'], [['karkade', 'hibisk'], 'tea-hibiscus'], [['zhasmin', 'jasmin'], 'tea-jasmine'], [['romashk', 'travyan', 'chabrec', 'tsvetoch', 'herbal', 'lipov'], 'tea-herbal'], [['ivan'], 'tea-ivan'], [['mate'], 'tea-mate'], [['roybush', 'rooibos'], 'tea-rooibos'], [['earl', 'erl-grey', 'bergamot'], 'tea-earl'], [['imbir', 'ginger'], 'tea-ginger'], [['yagod', 'berry', 'malin', 'smorod', 'klukv', 'vishn', 'brusnik'], 'tea-berry'], [['myat', 'mint'], 'tea-mint'], [['limon', 'lemon'], 'tea-lemon'], [['belyy', 'white', 'bai-mu'], 'tea-white'], [['molochn', 'milk'], 'tea-milk'], [['zelen', 'green', 'sencha', 'gyokuro', 'tegua'], 'tea-green'], [['chaynik', 'teapot'], 'tea-pot']], 'tea-black')
  }

  // кофе
  if (has('affogato', 'afogato')) return 'affogato'
  if (has('bambl', 'bumble')) return 'bumble'
  if (has('frappe', 'frape', 'glyase', 'glace')) return 'frappe'
  if (has('goryach', 'hot-choc') && has('shokolad', 'choc')) return has('bel', 'white') ? 'hot-chocolate-white' : 'hot-chocolate'
  if (has('kakao', 'cocoa')) return has('ays', 'iced', 'holodn') ? 'iced-cocoa' : 'cocoa'
  if (has('tonik', 'tonic')) return 'espresso-tonic'
  if (has('cold-brew', 'coldbrew') || word('kold')) return 'cold-brew'
  const iced = word('ays', 'iced', 'ice', 'holodn', 'aysd')
  if (iced) return has('amerikan', 'american') ? 'iced-americano' : word('raf') ? 'iced-raf' : 'iced-latte'
  const FLAVORS: Rule[] = [[['solen', 'salted'], 'salted-caramel'], [['karamel', 'caramel', 'iris'], 'caramel'], [['kokos', 'coconut'], 'coconut'], [['tykv', 'pumpkin'], 'pumpkin'], [['lavand', 'lavender'], 'lavender'], [['banan'], 'banana'], [['halv'], 'halva'], [['fistash', 'pistach', 'pistash'], 'pistachio'], [['pryan', 'gingerbr'], 'gingerbread'], [['koric', 'cinnam'], 'cinnamon'], [['klen', 'maple'], 'maple'], [['fundu', 'oreh', 'nut', 'mindal', 'arahis'], 'nut'], [['citrus', 'apelsin', 'orange', 'limon'], 'citrus'], [['vanil'], 'vanilla'], [['shokolad', 'choco'], 'chocolate']]
  if (word('raf')) {
    if (has('lavand', 'lavender')) return 'raf-lavender'
    if (word('med', 'medov', 'honey')) return 'raf-honey'
    const f = pick(FLAVORS, '')
    const raf = { caramel: 'raf-caramel', 'salted-caramel': 'raf-caramel', coconut: 'raf-coconut', citrus: 'raf-citrus', halva: 'raf-halva', pistachio: 'raf-pistachio', vanilla: 'raf-vanilla', nut: 'raf-halva' } as Record<string, string>
    return raf[f] ?? 'raf'
  }
  if (word('latte', 'late', 'latt')) {
    if (word('med', 'medov', 'honey')) return 'latte-honey'
    const f = pick(FLAVORS, '')
    return f && SPECS[`latte-${f}`] ? `latte-${f}` : 'latte'
  }
  if (has('kapuch', 'cappuc', 'kapuc')) return 'cappuccino'
  if (word('flet', 'flat')) return 'flat-white'
  if (has('mokk', 'mocha', 'mokach') || word('moka')) return 'mocha'
  if (has('kortad', 'cortad')) return 'cortado'
  if (has('makiat', 'macchiat', 'makkiat')) return 'macchiato'
  if (has('amerikan', 'american', 'lungo', 'filtr', 'filter', 'pour', 'v60', 'aeropress', 'aeropres', 'cikori', 'chikori', 'batch')) return 'americano'
  if (has('espresso', 'espreso', 'dopio', 'doppio', 'ristret')) return 'espresso'
  return null
}

const spec = computed<Spec>(() => {
  const key = SPECS[props.slug] ? props.slug : guess(props.slug) ?? (props.category ? guess(props.category) : null)
  return (key && SPECS[key]) || FALLBACK
})
const showImage = computed(() => props.imageUrl && !props.imageUrl.startsWith('art:'))
const uid = `pa${Math.random().toString(36).slice(2, 8)}`
</script>

<template>
  <div class="art" :class="{ tile }" :style="{ '--tone': spec.tone, width: size + 'px', height: size + 'px' }" aria-hidden="true">
    <img v-if="showImage" :src="imageUrl!" alt="" loading="lazy" />
    <svg v-else viewBox="0 0 120 120">
      <defs>
        <radialGradient :id="uid + 'l'" cx="45%" cy="40%" r="65%">
          <stop offset="0%" :stop-color="spec.foam ?? '#fff'" stop-opacity="0.35" />
          <stop offset="100%" :stop-color="spec.liquid ?? '#000'" stop-opacity="0" />
        </radialGradient>
        <filter :id="uid + 's'" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#1b140c" flood-opacity="0.16" />
        </filter>
      </defs>

      <!-- Чашка с блюдцем -->
      <g v-if="spec.kind === 'cup' || spec.kind === 'small'" :filter="`url(#${uid}s)`">
        <circle cx="60" cy="61" :r="spec.kind === 'small' ? 42 : 52" class="saucer" />
        <rect :x="spec.kind === 'small' ? 78 : 86" y="54" :width="spec.kind === 'small' ? 15 : 19" height="12" rx="6" class="rim" />
        <circle cx="58" cy="60" :r="spec.kind === 'small' ? 26 : 36" class="rim" />
        <circle cx="58" cy="60" :r="spec.kind === 'small' ? 21.5 : 31" :fill="spec.liquid" />
        <circle cx="58" cy="60" :r="spec.kind === 'small' ? 21.5 : 31" :fill="`url(#${uid}l)`" />

        <template v-if="spec.art === 'ring'">
          <circle cx="58" cy="60" :r="spec.kind === 'small' ? 17 : 25" fill="none" :stroke="spec.foam" stroke-width="5" opacity="0.65" />
          <circle cx="52" cy="54" r="3" :fill="spec.foam" opacity="0.5" />
        </template>
        <template v-else-if="spec.art === 'heart'">
          <circle cx="58" cy="60" :r="spec.kind === 'small' ? 16 : 24" :fill="spec.foam" />
          <path
            :transform="spec.kind === 'small' ? 'translate(58 60) scale(0.62) translate(-58 -60)' : ''"
            d="M58 75c-15-9-17-21-10-25 4-2.4 8-0.6 10 3.4 2-4 6-5.8 10-3.4 7 4 5 16-10 25z"
            :fill="spec.liquid"
          />
        </template>
        <template v-else-if="spec.art === 'tulip'">
          <circle cx="58" cy="60" r="24" :fill="spec.foam" />
          <path d="M58 78c-9-4-11-10-6-13 2.4-1.4 4.6-.4 6 1.6 1.4-2 3.6-3 6-1.6 5 3 3 9-6 13z" :fill="spec.liquid" />
          <path d="M58 66c-9-4-11-10-6-13 2.4-1.4 4.6-.4 6 1.6 1.4-2 3.6-3 6-1.6 5 3 3 9-6 13z" :fill="spec.liquid" />
          <path d="M58 54c-7-3-8.5-8-4.5-10 2-1 3.5-.3 4.5 1.2 1-1.5 2.5-2.2 4.5-1.2 4 2 2.5 7-4.5 10z" :fill="spec.liquid" />
          <path d="M58 44v36" :stroke="spec.liquid" stroke-width="1.6" />
        </template>
        <template v-else-if="spec.art === 'rosetta'">
          <circle cx="58" cy="60" r="25" :fill="spec.foam" />
          <g fill="none" :stroke="spec.liquid" stroke-linecap="round">
            <path d="M44 74q14 8 28 0" stroke-width="4" />
            <path d="M45.5 67q12.5 7 25 0" stroke-width="3.6" />
            <path d="M47 60q11 6 22 0" stroke-width="3.2" />
            <path d="M49 53.5q9 5 18 0" stroke-width="2.8" />
            <path d="M51.5 47.5q6.5 3.5 13 0" stroke-width="2.4" />
            <path d="M58 42v38" stroke-width="1.6" />
          </g>
        </template>
        <template v-else-if="spec.art === 'specks'">
          <circle cx="58" cy="60" r="27" :fill="spec.foam" opacity="0.55" />
          <g :fill="spec.extra ?? '#2d1a0c'" opacity="0.75">
            <circle cx="50" cy="52" r="1.2" /><circle cx="63" cy="49" r="1" /><circle cx="68" cy="62" r="1.3" />
            <circle cx="55" cy="68" r="1" /><circle cx="47" cy="63" r="0.9" /><circle cx="60" cy="58" r="1.1" />
            <circle cx="66" cy="71" r="0.9" /><circle cx="52" cy="76" r="1" /><circle cx="72" cy="54" r="0.8" />
          </g>
        </template>
        <template v-else-if="spec.art === 'swirl'">
          <path
            d="M58 60m-2 0a2 2 0 1 1 4 0a6 6 0 1 1-12 0a10 10 0 1 1 20 0a14 14 0 1 1-28 0a18 18 0 1 1 36 0"
            fill="none"
            :stroke="spec.foam"
            stroke-width="2.6"
            stroke-linecap="round"
            opacity="0.85"
          />
        </template>
        <template v-else-if="spec.art === 'marsh'">
          <g fill="#fbf6ee" stroke="#e7d7c4" stroke-width="0.8">
            <rect x="44" y="48" width="10" height="10" rx="3" transform="rotate(-14 49 53)" />
            <rect x="60" y="45" width="10" height="10" rx="3" transform="rotate(18 65 50)" />
            <rect x="55" y="60" width="10" height="10" rx="3" transform="rotate(6 60 65)" />
            <rect x="68" y="62" width="9" height="9" rx="3" transform="rotate(-20 72 66)" />
            <rect x="43" y="64" width="9" height="9" rx="3" transform="rotate(24 47 68)" />
          </g>
        </template>
        <template v-else-if="spec.art === 'leaf'">
          <path d="M48 68c4-14 16-20 24-18-2 10-12 20-24 18z" fill="#7aa35a" opacity="0.9" />
          <path d="M50 66c6-5 12-9 19-13" stroke="#4f7a39" stroke-width="1.2" fill="none" />
        </template>
        <template v-else-if="spec.art === 'drizzle'">
          <circle cx="58" cy="60" r="25" :fill="spec.foam" />
          <g fill="none" :stroke="spec.extra" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.9">
            <path d="M40 52l6 5 6-5 6 5 6-5 6 5 6-5" />
            <path d="M38 62l6 5 6-5 6 5 6-5 6 5 6-5 4 3" />
            <path d="M42 72l6 4 6-4 6 4 6-4 6 4 4-2" />
          </g>
        </template>
        <template v-else-if="spec.art === 'flakes'">
          <circle cx="58" cy="60" r="26" :fill="spec.foam" />
          <g fill="#ffffff" stroke="#e8dcc8" stroke-width="0.5">
            <rect x="46" y="48" width="7" height="2.4" rx="1" transform="rotate(25 49 49)" /><rect x="61" y="46" width="6" height="2.2" rx="1" transform="rotate(-30 64 47)" />
            <rect x="67" y="60" width="7" height="2.4" rx="1" transform="rotate(60 70 61)" /><rect x="50" y="66" width="6" height="2.2" rx="1" transform="rotate(-10 53 67)" />
            <rect x="58" y="56" width="6" height="2.2" rx="1" transform="rotate(80 61 57)" /><rect x="44" y="58" width="5" height="2" rx="1" transform="rotate(40 46 59)" />
            <rect x="62" y="70" width="6" height="2.2" rx="1" transform="rotate(-50 65 71)" />
          </g>
        </template>
        <template v-else-if="spec.art === 'lemon'">
          <circle cx="64" cy="56" r="12" fill="#f5d33f" />
          <circle cx="64" cy="56" r="9.5" fill="#fff3b8" />
          <g stroke="#f5d33f" stroke-width="1.2"><path d="M64 46.5v19M54.5 56h19M57.3 49.3l13.4 13.4M70.7 49.3L57.3 62.7" /></g>
          <circle cx="64" cy="56" r="1.6" fill="#fff" />
        </template>
        <template v-else-if="spec.art === 'flower'">
          <g :fill="spec.extra ?? '#ffffff'" opacity="0.95">
            <ellipse cx="62" cy="49" rx="3.6" ry="7" /><ellipse cx="62" cy="49" rx="3.6" ry="7" transform="rotate(72 62 57)" />
            <ellipse cx="62" cy="49" rx="3.6" ry="7" transform="rotate(144 62 57)" /><ellipse cx="62" cy="49" rx="3.6" ry="7" transform="rotate(216 62 57)" />
            <ellipse cx="62" cy="49" rx="3.6" ry="7" transform="rotate(288 62 57)" />
          </g>
          <circle cx="62" cy="57" r="3.6" fill="#f2c12e" />
          <path d="M46 70c4-5 9-6 13-4" stroke="#4f7a39" stroke-width="1.3" fill="none" />
          <ellipse cx="49" cy="68" rx="2.2" ry="4.2" fill="#7aa35a" transform="rotate(50 49 68)" />
        </template>
        <template v-else-if="spec.art === 'berry'">
          <g>
            <circle cx="52" cy="54" r="5" fill="#c2384f" /><circle cx="63" cy="51" r="4.6" fill="#3e4f8f" />
            <circle cx="60" cy="63" r="5" fill="#c2384f" /><circle cx="68" cy="61" r="4" fill="#7a1f3a" />
          </g>
          <g fill="#fff" opacity="0.55"><circle cx="50.5" cy="52.5" r="1.4" /><circle cx="61.8" cy="49.6" r="1.2" /><circle cx="58.5" cy="61.5" r="1.4" /></g>
        </template>
        <template v-else-if="spec.art === 'mint'">
          <path d="M50 64c2-10 10-14 16-12-1 8-8 14-16 12z" fill="#5c9a4a" />
          <path d="M60 68c6-6 13-6 16-2-4 5-11 7-16 2z" fill="#6fae58" />
          <path d="M51 63c4-4 9-7 14-10M61 67c5-1 9-1 14-1" stroke="#3e6f30" stroke-width="1" fill="none" />
        </template>
        <template v-else-if="spec.art === 'scoop'">
          <circle cx="58" cy="60" r="14" :fill="spec.foam" />
          <path d="M48 56c3-4 9-6 14-4" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.8" />
          <circle cx="58" cy="60" r="14" fill="none" stroke="#d9c4a0" stroke-width="1" />
        </template>
      </g>

      <!-- Стакан со льдом, вид сверху -->
      <g v-else-if="spec.kind === 'glass'" :filter="`url(#${uid}s)`">
        <circle cx="60" cy="60" r="44" class="glass" />
        <circle cx="60" cy="60" r="38" :fill="spec.liquid" />
        <circle cx="60" cy="60" r="38" :fill="spec.foam" opacity="0.35" />
        <g fill="#ffffff" fill-opacity="0.62" stroke="#ffffff" stroke-opacity="0.9" stroke-width="1">
          <rect x="38" y="40" width="20" height="20" rx="5" transform="rotate(-12 48 50)" />
          <rect x="62" y="38" width="18" height="18" rx="5" transform="rotate(16 71 47)" />
          <rect x="52" y="62" width="19" height="19" rx="5" transform="rotate(8 61 71)" />
          <rect x="35" y="62" width="14" height="14" rx="4" transform="rotate(-24 42 69)" />
        </g>
        <template v-if="spec.extra">
          <path d="M70 70c6-8 12-10 16-9" :stroke="spec.extra" stroke-width="1.4" fill="none" />
          <g :fill="spec.extra">
            <ellipse cx="76" cy="66" rx="2" ry="4.5" transform="rotate(40 76 66)" />
            <ellipse cx="81" cy="63" rx="2" ry="4.5" transform="rotate(60 81 63)" />
            <ellipse cx="72" cy="71" rx="2" ry="4.5" transform="rotate(20 72 71)" />
          </g>
        </template>
        <circle cx="77" cy="74" r="6" fill="var(--stamp)" />
        <circle cx="77" cy="74" r="3.2" :fill="spec.liquid" opacity="0.8" />
        <path d="M30 44a36 36 0 0 1 22-18" stroke="#fff" stroke-opacity="0.7" stroke-width="3" fill="none" stroke-linecap="round" />
      </g>

      <!-- Круассан -->
      <g v-else-if="spec.kind === 'croissant'" :filter="`url(#${uid}s)`" transform="rotate(-18 60 60)">
        <ellipse cx="60" cy="64" rx="14" ry="20" fill="#d99a45" />
        <ellipse cx="42" cy="62" rx="11" ry="16" fill="#e2a957" transform="rotate(-28 42 62)" />
        <ellipse cx="78" cy="62" rx="11" ry="16" fill="#e2a957" transform="rotate(28 78 62)" />
        <ellipse cx="28" cy="55" rx="8" ry="12" fill="#e9b867" transform="rotate(-48 28 55)" />
        <ellipse cx="92" cy="55" rx="8" ry="12" fill="#e9b867" transform="rotate(48 92 55)" />
        <g stroke="#a8692a" stroke-width="1.4" fill="none" opacity="0.7" stroke-linecap="round">
          <path d="M52 50q8 6 16 0" /><path d="M50 62q10 7 20 0" /><path d="M52 74q8 6 16 0" />
          <path d="M37 54q4 6 10 7" /><path d="M83 54q-4 6-10 7" />
        </g>
        <ellipse cx="56" cy="56" rx="4" ry="7" fill="#fff" opacity="0.22" />
        <g v-if="spec.extra === 'almond'" fill="#f7ecd8" stroke="#dcc39b" stroke-width="0.6">
          <ellipse cx="54" cy="58" rx="2.4" ry="4" transform="rotate(30 54 58)" />
          <ellipse cx="63" cy="66" rx="2.4" ry="4" transform="rotate(-20 63 66)" />
          <ellipse cx="45" cy="64" rx="2.2" ry="3.6" transform="rotate(70 45 64)" />
          <ellipse cx="73" cy="58" rx="2.2" ry="3.6" transform="rotate(-60 73 58)" />
          <ellipse cx="60" cy="74" rx="2.2" ry="3.6" transform="rotate(10 60 74)" />
        </g>
        <path v-if="spec.extra === 'choco'" d="M34 56l7 7 7-7 7 7 7-7 7 7 7-7 7 7 7-7" stroke="#3a1f10" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round" />
        <g v-if="spec.extra === 'almond'" fill="#fff" opacity="0.8">
          <circle cx="50" cy="70" r="0.9" /><circle cx="66" cy="54" r="0.8" /><circle cx="70" cy="72" r="0.9" /><circle cx="40" cy="58" r="0.8" />
        </g>
      </g>

      <!-- Синнабон -->
      <g v-else-if="spec.kind === 'cinnabon'" :filter="`url(#${uid}s)`">
        <circle cx="60" cy="60" r="46" class="saucer" />
        <circle cx="60" cy="60" r="32" fill="#d8a066" />
        <path
          d="M60 60m-2 0a2 2 0 1 1 4 0a7 7 0 1 1-14 0a12 12 0 1 1 24 0a17 17 0 1 1-34 0a22 22 0 1 1 44 0"
          fill="none"
          stroke="#8b4f22"
          stroke-width="3"
          stroke-linecap="round"
        />
        <path d="M40 52c6-6 10 2 16-4s10 4 16-2 8 6 10 10c-4 8-12 4-18 9s-12-1-18 3-10-6-6-16z" fill="#fbf4e8" opacity="0.88" />
      </g>

      <!-- Чизкейк -->
      <g v-else-if="spec.kind === 'cake'" :filter="`url(#${uid}s)`">
        <circle cx="60" cy="60" r="46" class="saucer" />
        <path d="M34 78L60 28l26 50z" :fill="spec.fill ?? '#f4e2b8'" stroke="rgb(0 0 0 / 0.08)" stroke-width="1" stroke-linejoin="round" />
        <path d="M34 78h52l-4 6H38z" :fill="spec.crust ?? '#c48a4a'" />
        <template v-if="spec.style === 'medovik'">
          <g fill="#c9853a" opacity="0.6"><circle cx="55" cy="55" r="1.4" /><circle cx="62" cy="62" r="1.2" /><circle cx="58" cy="70" r="1.5" /><circle cx="66" cy="72" r="1.1" /><circle cx="52" cy="66" r="1" /></g>
          <path d="M46 70h28M50 62h20M54 54h12" stroke="#f5d9a6" stroke-width="1.4" />
        </template>
        <template v-else-if="spec.style === 'layers'">
          <path d="M48 54h24M43 62h34M39 70h42" stroke="#e2c48c" stroke-width="1.8" />
          <g fill="#ffffff" opacity="0.9"><circle cx="56" cy="44" r="1" /><circle cx="62" cy="48" r="0.9" /><circle cx="58" cy="58" r="1" /><circle cx="66" cy="66" r="0.9" /><circle cx="50" cy="66" r="1" /><circle cx="60" cy="74" r="0.9" /></g>
        </template>
        <template v-else-if="spec.style === 'choco'">
          <path d="M48 54q3 6 0 10M58 50q2 8-1 14M68 56q3 5 0 9" stroke="#2e170b" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.8" />
          <g fill="#8a5a36"><rect x="52" y="66" width="5" height="2" rx="1" transform="rotate(30 54 67)" /><rect x="62" y="70" width="5" height="2" rx="1" transform="rotate(-20 64 71)" /><rect x="58" y="60" width="4" height="1.8" rx="0.9" transform="rotate(70 60 61)" /></g>
        </template>
        <template v-else-if="spec.style === 'velvet'">
          <path d="M47 58h26M42 68h36" stroke="#f4ece2" stroke-width="2.4" />
          <g fill="#8e1a2a"><circle cx="56" cy="46" r="1.4" /><circle cx="62" cy="52" r="1.2" /><circle cx="54" cy="74" r="1.3" /></g>
        </template>
        <template v-else-if="spec.style === 'carrot'">
          <path d="M45 62h30" stroke="#f4ece2" stroke-width="2.4" />
          <g fill="#a8743a"><ellipse cx="58" cy="50" rx="3.4" ry="2.6" /><ellipse cx="54" cy="70" rx="3" ry="2.3" /><ellipse cx="66" cy="72" rx="3" ry="2.3" /></g>
          <path d="M62 44c2-2 4-2 5-1" stroke="#4f7a39" stroke-width="1.4" fill="none" />
        </template>
        <template v-else-if="spec.style === 'pie'">
          <g stroke="#c4823a" stroke-width="2.2" stroke-linecap="round"><path d="M46 70l14-26M56 76l16-30M66 77l10-18" /><path d="M42 70h38M47 60h26M52 50h16" /></g>
        </template>
        <template v-else-if="spec.style === 'lemon'">
          <circle cx="60" cy="58" r="7" fill="#f5d33f" /><circle cx="60" cy="58" r="5.2" fill="#fff3b8" />
          <path d="M60 52.8v10.4M54.8 58h10.4" stroke="#f5d33f" stroke-width="1" />
          <g fill="#ffffff" opacity="0.9"><circle cx="54" cy="70" r="1" /><circle cx="66" cy="68" r="1" /></g>
        </template>
        <template v-else-if="spec.style === 'caramel'">
          <path d="M44 66l5 4 5-4 5 4 5-4 5 4 5-4 5 4" stroke="#b8742c" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" />
          <g fill="#ffffff"><circle cx="58" cy="52" r="1" /><circle cx="62" cy="58" r="0.9" /></g>
        </template>
        <template v-else>
          <path d="M52 52c4 3 12 3 16 0" stroke="#e3c58b" stroke-width="1.2" fill="none" />
          <circle cx="66" cy="66" r="4.5" fill="var(--stamp)" />
          <path d="M66 61.5c1-2 3-2.5 4-2" stroke="#4f7a39" stroke-width="1.4" fill="none" />
        </template>
      </g>

      <!-- Сок: стакан без льда, долька на краю -->
      <g v-else-if="spec.kind === 'juice'" :filter="`url(#${uid}s)`">
        <circle cx="60" cy="60" r="42" class="glass" />
        <circle cx="60" cy="60" r="36" :fill="spec.liquid" />
        <circle cx="54" cy="54" r="24" :fill="spec.foam" opacity="0.45" />
        <g :fill="spec.foam" opacity="0.9"><circle cx="48" cy="66" r="1.4" /><circle cx="62" cy="48" r="1.2" /><circle cx="70" cy="64" r="1.5" /><circle cx="56" cy="74" r="1.1" /><circle cx="44" cy="52" r="1" /></g>
        <g transform="rotate(-30 88 34)">
          <circle cx="88" cy="34" r="15" :fill="spec.extra" />
          <circle cx="88" cy="34" r="12" fill="#fff6dc" opacity="0.55" />
          <g stroke="#fff" stroke-width="1.4" opacity="0.85"><path d="M88 22v24M76 34h24M80 26l16 16M96 26l-16 16" /></g>
        </g>
        <circle cx="38" cy="78" r="5" fill="var(--stamp)" /><circle cx="38" cy="78" r="2.6" :fill="spec.liquid" />
      </g>

      <!-- Молочный коктейль: сливки, трубочка, посыпка -->
      <g v-else-if="spec.kind === 'shake'" :filter="`url(#${uid}s)`">
        <circle cx="60" cy="60" r="44" class="glass" />
        <circle cx="60" cy="60" r="38" :fill="spec.liquid" />
        <path
          d="M60 60m-4 0a4 4 0 1 1 8 0a9 9 0 1 1-18 0a14 14 0 1 1 28 0a19 19 0 1 1-38 0"
          fill="none" :stroke="spec.foam" stroke-width="7" stroke-linecap="round"
        />
        <circle cx="60" cy="60" r="5" :fill="spec.foam" />
        <g :fill="spec.extra">
          <rect x="49" y="47" width="5" height="1.8" rx="0.9" transform="rotate(30 51 48)" /><rect x="66" y="52" width="5" height="1.8" rx="0.9" transform="rotate(-20 68 53)" />
          <rect x="56" y="70" width="5" height="1.8" rx="0.9" transform="rotate(70 58 71)" /><rect x="44" y="62" width="5" height="1.8" rx="0.9" transform="rotate(-50 46 63)" />
          <rect x="70" y="66" width="5" height="1.8" rx="0.9" transform="rotate(10 72 67)" />
        </g>
        <circle cx="80" cy="40" r="6" fill="var(--stamp)" /><circle cx="80" cy="40" r="3.2" fill="#fff" opacity="0.85" />
      </g>

      <!-- Тирамису / брауни: квадратный кусок -->
      <g v-else-if="spec.kind === 'square'" :filter="`url(#${uid}s)`">
        <circle cx="60" cy="60" r="46" class="saucer" />
        <g transform="rotate(-10 60 60)">
          <rect x="34" y="34" width="52" height="52" rx="6" :fill="spec.style === 'brownie' ? '#4a2614' : '#e9d6b6'" />
          <template v-if="spec.style === 'tiramisu'">
            <rect x="34" y="34" width="52" height="52" rx="6" fill="#8a5a36" opacity="0.85" />
            <g fill="#5a341c" opacity="0.7"><circle cx="44" cy="46" r="1.6" /><circle cx="58" cy="42" r="1.2" /><circle cx="72" cy="50" r="1.8" /><circle cx="50" cy="64" r="1.3" /><circle cx="66" cy="70" r="1.6" /><circle cx="76" cy="62" r="1" /><circle cx="42" cy="76" r="1.2" /></g>
            <path d="M46 56c6-6 12 2 18-4s10 2 12 0" stroke="#c49a6c" stroke-width="1.6" fill="none" opacity="0.7" />
          </template>
          <template v-else>
            <path d="M40 48l10 4 6-6 10 8 10-4M42 66l8-4 8 6 10-6 8 4" stroke="#6e3a1d" stroke-width="1.8" fill="none" />
            <g fill="#c9a06a"><ellipse cx="50" cy="58" rx="4" ry="3" /><ellipse cx="70" cy="74" rx="3.5" ry="2.6" /><ellipse cx="72" cy="44" rx="3" ry="2.4" /></g>
          </template>
        </g>
      </g>

      <!-- Макаронс -->
      <g v-else-if="spec.kind === 'macaron'" :filter="`url(#${uid}s)`">
        <circle cx="60" cy="60" r="48" class="saucer" />
        <g v-for="(m, i) in [{ x: 44, y: 50, c: '#a8c97a' }, { x: 74, y: 52, c: '#e98aa0' }, { x: 58, y: 76, c: '#d9a35a' }]" :key="i">
          <circle :cx="m.x" :cy="m.y" r="15" :fill="m.c" />
          <circle :cx="m.x" :cy="m.y" r="15" fill="none" stroke="#fff" stroke-opacity="0.5" stroke-width="2" stroke-dasharray="2 2" />
          <circle :cx="m.x - 4" :cy="m.y - 4" r="4" fill="#fff" opacity="0.25" />
        </g>
      </g>

      <!-- Сырники -->
      <g v-else-if="spec.kind === 'plate'" :filter="`url(#${uid}s)`">
        <circle cx="60" cy="60" r="50" class="saucer" />
        <circle cx="60" cy="60" r="40" class="rim" />
        <g fill="#d99848" stroke="#b67530" stroke-width="1">
          <circle cx="46" cy="52" r="13" /><circle cx="70" cy="50" r="13" /><circle cx="58" cy="72" r="13" />
        </g>
        <g fill="#f0c27a" opacity="0.8"><circle cx="43" cy="49" r="5" /><circle cx="67" cy="47" r="5" /><circle cx="55" cy="69" r="5" /></g>
        <path d="M76 66c6 0 10 4 8 8s-10 6-14 2 0-10 6-10z" fill="#fbf6ee" />
        <path d="M34 70c4-2 9 0 9 4s-6 6-9 4-3-6 0-8z" fill="#b83a3a" />
      </g>

      <!-- Гранола -->
      <g v-else-if="spec.kind === 'bowl'" :filter="`url(#${uid}s)`">
        <circle cx="60" cy="60" r="46" class="rim" />
        <circle cx="60" cy="60" r="38" fill="#f8f4ec" />
        <g fill="#c58b45"><circle cx="48" cy="50" r="5" /><circle cx="56" cy="46" r="4" /><circle cx="66" cy="52" r="5.5" /><circle cx="52" cy="58" r="4.5" /><circle cx="62" cy="62" r="4" /><circle cx="44" cy="62" r="3.5" /></g>
        <g fill="#9e6630" opacity="0.7"><circle cx="60" cy="50" r="2.5" /><circle cx="47" cy="56" r="2.2" /><circle cx="68" cy="58" r="2.4" /></g>
        <g fill="#b9364a"><circle cx="70" cy="70" r="5" /><circle cx="58" cy="76" r="4.5" /></g>
        <g fill="#3e4f8f"><circle cx="76" cy="62" r="4" /><circle cx="48" cy="72" r="3.6" /><circle cx="64" cy="78" r="3.2" /></g>
      </g>
      <!-- Смузи: густой, с топпингом и трубочкой -->
      <g v-else-if="spec.kind === 'smoothie'" :filter="`url(#${uid}s)`">
        <circle cx="60" cy="60" r="44" class="glass" />
        <circle cx="60" cy="60" r="38" :fill="spec.liquid" />
        <g fill="none" :stroke="spec.foam" stroke-width="2.6" stroke-linecap="round" opacity="0.75">
          <path d="M34 50q13-7 26 0t26 0" /><path d="M30 62q15-8 30 0t30 0" /><path d="M34 74q13-7 26 0t26 0" />
        </g>
        <template v-if="spec.style === 'berry'">
          <circle cx="48" cy="50" r="5.5" fill="#c2384f" /><circle cx="57" cy="45" r="5" fill="#3e4f8f" /><circle cx="54" cy="57" r="4.6" fill="#3e4f8f" /><circle cx="64" cy="53" r="5.5" fill="#c2384f" />
          <g fill="#fff" opacity="0.55"><circle cx="46.5" cy="48.5" r="1.5" /><circle cx="55.6" cy="43.6" r="1.3" /><circle cx="62.5" cy="51.5" r="1.5" /></g>
          <path d="M40 60c2-6 7-8 11-7-1 5-6 8-11 7z" fill="#5c9a4a" />
        </template>
        <template v-else-if="spec.style === 'banana'">
          <g fill="#f8eab0" stroke="#e6cf7a" stroke-width="1"><circle cx="48" cy="50" r="7" /><circle cx="61" cy="47" r="7" /><circle cx="55" cy="60" r="7" /></g>
          <g fill="#c9a24a"><circle cx="48" cy="50" r="1" /><circle cx="61" cy="47" r="1" /><circle cx="55" cy="60" r="1" /></g>
          <path d="M66 58c4-4 10-2 10 3s-5 9-9 8-5-7-1-11z" fill="#d2412f" />
          <g fill="#f8e6a0"><circle cx="70" cy="62" r="0.7" /><circle cx="72" cy="65" r="0.7" /><circle cx="69" cy="66" r="0.7" /></g>
          <path d="M70 57c1-2 3-3 5-2" stroke="#4f7a39" stroke-width="1.6" fill="none" />
        </template>
        <template v-else-if="spec.style === 'kiwi'">
          <g v-for="(k, i) in [{ x: 49, y: 50 }, { x: 63, y: 48 }, { x: 56, y: 61 }]" :key="i">
            <circle :cx="k.x" :cy="k.y" r="7.5" fill="#8cc152" stroke="#6b4a2a" stroke-width="1" />
            <circle :cx="k.x" :cy="k.y" r="3.5" fill="#e3f2c4" />
            <g fill="#2a1d16"><circle :cx="k.x + 5" :cy="k.y" r="0.7" /><circle :cx="k.x - 5" :cy="k.y" r="0.7" /><circle :cx="k.x" :cy="k.y + 5" r="0.7" /><circle :cx="k.x" :cy="k.y - 5" r="0.7" /></g>
          </g>
          <path d="M40 66c2-6 7-8 11-7-1 5-6 8-11 7z" fill="#5c9a4a" />
        </template>
        <template v-else>
          <g fill="#f6a623" stroke="#e08a12" stroke-width="0.8">
            <rect x="44" y="45" width="9" height="9" rx="2" transform="rotate(-12 48 49)" /><rect x="57" y="43" width="9" height="9" rx="2" transform="rotate(18 61 47)" />
            <rect x="51" y="56" width="9" height="9" rx="2" transform="rotate(6 55 60)" /><rect x="63" y="56" width="8" height="8" rx="2" transform="rotate(-22 67 60)" />
          </g>
          <g fill="#ffffff" opacity="0.9"><rect x="46" y="62" width="5" height="1.8" rx="0.9" transform="rotate(30 48 63)" /><rect x="60" y="66" width="5" height="1.8" rx="0.9" transform="rotate(-20 62 67)" /></g>
        </template>
        <circle cx="80" cy="40" r="6.5" fill="var(--stamp)" /><circle cx="80" cy="40" r="3.4" fill="#fff" opacity="0.85" />
      </g>

      <!-- Эклер -->
      <g v-else-if="spec.kind === 'eclair'" :filter="`url(#${uid}s)`">
        <circle cx="60" cy="60" r="46" class="saucer" />
        <g transform="rotate(-28 60 60)">
          <rect x="24" y="47" width="72" height="26" rx="13" fill="#d99a45" />
          <rect x="27" y="49" width="66" height="17" rx="8.5" :fill="spec.fill ?? '#4a2614'" />
          <path d="M34 58q4-4 8 0t8 0 8 0 8 0 8 0 8 0" stroke="#fff" stroke-opacity="0.45" stroke-width="1.4" fill="none" />
          <ellipse cx="40" cy="53" rx="7" ry="1.8" fill="#fff" opacity="0.28" />
        </g>
      </g>

      <!-- Пончик -->
      <g v-else-if="spec.kind === 'donut'" :filter="`url(#${uid}s)`">
        <circle cx="60" cy="60" r="46" class="saucer" />
        <circle cx="60" cy="60" r="31" fill="#e2a857" />
        <path d="M60 33c8 0 10 4 16 5s9 7 10 13-3 9-2 15-5 11-11 13-9-1-14 1-11-1-15-6-8-7-7-13-4-10 0-16 9-6 14-8 4-4 9-4z" :fill="spec.fill ?? '#e98aa0'" />
        <circle cx="60" cy="60" r="10" class="saucer" />
        <g>
          <rect x="44" y="44" width="6" height="2" rx="1" fill="#f2c12e" transform="rotate(30 47 45)" /><rect x="70" y="46" width="6" height="2" rx="1" fill="#3e8fd8" transform="rotate(-40 73 47)" />
          <rect x="76" y="64" width="6" height="2" rx="1" fill="#ffffff" transform="rotate(70 79 65)" /><rect x="52" y="76" width="6" height="2" rx="1" fill="#5cb85c" transform="rotate(-10 55 77)" />
          <rect x="40" y="64" width="6" height="2" rx="1" fill="#3e8fd8" transform="rotate(50 43 65)" /><rect x="64" y="76" width="6" height="2" rx="1" fill="#f2c12e" transform="rotate(20 67 77)" />
          <rect x="58" y="40" width="6" height="2" rx="1" fill="#ffffff" transform="rotate(-60 61 41)" />
        </g>
      </g>

      <!-- Печенье -->
      <g v-else-if="spec.kind === 'cookie'" :filter="`url(#${uid}s)`">
        <circle cx="60" cy="60" r="48" class="saucer" />
        <g v-for="(c, i) in [{ x: 46, y: 50 }, { x: 74, y: 52 }, { x: 59, y: 76 }]" :key="i">
          <circle :cx="c.x" :cy="c.y" r="16" fill="#d9a05b" stroke="#b97d3a" stroke-width="1.2" />
          <g fill="#4a2614"><ellipse :cx="c.x - 6" :cy="c.y - 4" rx="2.4" ry="1.8" /><ellipse :cx="c.x + 5" :cy="c.y - 6" rx="2" ry="1.6" /><ellipse :cx="c.x + 3" :cy="c.y + 5" rx="2.4" ry="1.8" /><ellipse :cx="c.x - 5" :cy="c.y + 6" rx="1.8" ry="1.4" /><ellipse :cx="c.x + 8" :cy="c.y + 1" rx="1.6" ry="1.3" /></g>
          <circle :cx="c.x - 5" :cy="c.y - 7" r="4" fill="#fff" opacity="0.18" />
        </g>
      </g>

      <!-- Маффин / капкейк -->
      <g v-else-if="spec.kind === 'muffin'" :filter="`url(#${uid}s)`">
        <circle cx="60" cy="60" r="46" class="saucer" />
        <circle cx="60" cy="60" r="32" fill="#f4ece0" stroke="#d9cbb5" stroke-width="1" />
        <circle cx="60" cy="60" r="32" fill="none" stroke="#e6d9c4" stroke-width="4" stroke-dasharray="3 3" />
        <circle cx="60" cy="60" r="25" :fill="spec.fill ?? '#c98a4a'" />
        <template v-if="spec.style === 'cream'">
          <path d="M60 60m-3 0a3 3 0 1 1 6 0a8 8 0 1 1-16 0a13 13 0 1 1 26 0a18 18 0 1 1-36 0" fill="none" :stroke="spec.extra" stroke-width="7" stroke-linecap="round" />
          <circle cx="60" cy="60" r="6" :fill="spec.extra" />
          <circle cx="62" cy="57" r="4.5" fill="var(--stamp)" /><path d="M63 53c1-3 3-4 5-4" stroke="#4f7a39" stroke-width="1.3" fill="none" />
          <g fill="#ffffff"><rect x="48" y="50" width="4" height="1.6" rx="0.8" transform="rotate(30 50 51)" /><rect x="70" y="66" width="4" height="1.6" rx="0.8" transform="rotate(-30 72 67)" /></g>
        </template>
        <template v-else>
          <g fill="#ffffff" opacity="0.2"><circle cx="52" cy="52" r="7" /><circle cx="66" cy="64" r="6" /></g>
          <g :fill="spec.extra ?? '#3e4f8f'"><circle cx="52" cy="58" r="3" /><circle cx="64" cy="52" r="2.8" /><circle cx="60" cy="68" r="3" /><circle cx="70" cy="62" r="2.6" /><circle cx="50" cy="68" r="2.4" /></g>
        </template>
      </g>

      <!-- Вафли -->
      <g v-else-if="spec.kind === 'waffle'" :filter="`url(#${uid}s)`">
        <circle cx="60" cy="60" r="48" class="saucer" />
        <g transform="rotate(-12 60 60)">
          <rect x="30" y="30" width="60" height="60" rx="8" fill="#e6b062" />
          <g stroke="#c58a3a" stroke-width="2.4"><path d="M42 30v60M54 30v60M66 30v60M78 30v60M30 42h60M30 54h60M30 66h60M30 78h60" /></g>
          <rect x="30" y="30" width="60" height="60" rx="8" fill="none" stroke="#c58a3a" stroke-width="2" />
        </g>
        <circle cx="62" cy="58" r="9" fill="#fbf6ee" /><circle cx="56" cy="56" r="4" fill="var(--stamp)" /><circle cx="68" cy="62" r="3.6" fill="#3e4f8f" /><circle cx="62" cy="66" r="3.4" fill="var(--stamp)" />
      </g>

      <!-- Блины -->
      <g v-else-if="spec.kind === 'blini'" :filter="`url(#${uid}s)`">
        <circle cx="60" cy="60" r="50" class="saucer" />
        <circle cx="60" cy="60" r="40" class="rim" />
        <path d="M28 66L62 30a36 36 0 0 1 12 44z" fill="#ecc277" stroke="#d0a050" stroke-width="1" />
        <path d="M34 78L66 46a30 30 0 0 1 6 36z" fill="#f0cb84" stroke="#d0a050" stroke-width="1" />
        <g fill="#c98a3a" opacity="0.5"><circle cx="54" cy="46" r="2" /><circle cx="62" cy="58" r="1.6" /><circle cx="58" cy="72" r="1.8" /><circle cx="48" cy="62" r="1.4" /></g>
        <path d="M76 70c5 0 9 3 7 7s-9 5-12 2 0-9 5-9z" fill="#fbf6ee" />
        <circle cx="40" cy="44" r="5" fill="#b83a3a" /><circle cx="46" cy="38" r="3.6" fill="#b83a3a" />
      </g>

      <!-- Мороженое -->
      <g v-else-if="spec.kind === 'icecream'" :filter="`url(#${uid}s)`">
        <circle cx="60" cy="60" r="46" class="rim" />
        <circle cx="60" cy="60" r="38" fill="#f8f4ec" />
        <circle cx="48" cy="54" r="14" :fill="spec.fill" stroke="rgb(0 0 0 / 0.06)" />
        <circle cx="70" cy="54" r="14" :fill="spec.extra" stroke="rgb(0 0 0 / 0.06)" />
        <circle cx="59" cy="72" r="14" :fill="spec.crust" stroke="rgb(0 0 0 / 0.06)" />
        <g fill="#fff" opacity="0.35"><circle cx="44" cy="50" r="4" /><circle cx="66" cy="50" r="4" /><circle cx="55" cy="68" r="4" /></g>
        <rect x="74" y="66" width="22" height="7" rx="2" fill="#d9a05b" transform="rotate(-35 85 70)" />
        <path d="M54 44c2-5 6-6 9-5-1 4-5 6-9 5z" fill="#5c9a4a" />
      </g>

      <!-- Сэндвич -->
      <g v-else-if="spec.kind === 'sandwich'" :filter="`url(#${uid}s)`">
        <circle cx="60" cy="60" r="48" class="saucer" />
        <path d="M30 38h44L30 82z" fill="#ead19a" stroke="#c4935a" stroke-width="3" stroke-linejoin="round" />
        <path d="M90 82H46l44-44z" fill="#ead19a" stroke="#c4935a" stroke-width="3" stroke-linejoin="round" />
        <path d="M74 38L30 82" stroke="#7cb342" stroke-width="3" /><path d="M90 38L46 82" stroke="#7cb342" stroke-width="3" />
        <path d="M71 40L32 79" stroke="#e0432a" stroke-width="1.8" /><path d="M88 42L49 81" stroke="#f2c12e" stroke-width="1.8" />
      </g>
    </svg>
  </div>
</template>

<style scoped>
.art {
  position: relative;
  flex: none;
  display: grid;
  place-items: center;
  overflow: hidden;
}
.art.tile {
  background: color-mix(in oklab, var(--tone) 78%, var(--surface));
  border-radius: var(--r-tile);
}
:root[data-theme='dark'] .art.tile {
  background: color-mix(in oklab, var(--tone) 16%, var(--surface-2));
}
.art svg {
  width: 88%;
  height: 88%;
}
.art img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.saucer {
  fill: #fbfbf8;
  stroke: rgb(0 0 0 / 0.06);
}
.rim {
  fill: #ffffff;
  stroke: rgb(0 0 0 / 0.07);
}
.glass {
  fill: rgb(255 255 255 / 0.55);
  stroke: rgb(255 255 255 / 0.9);
  stroke-width: 2;
}
:root[data-theme='dark'] .saucer {
  fill: #e9ece6;
}
:root[data-theme='dark'] .rim {
  fill: #f4f5f2;
}
</style>
