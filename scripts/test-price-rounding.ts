import { roundPrice, formatRoundedPrice } from '../src/lib/utils/price-rounding';

const precios = [20171, 38661, 64419];

console.log('=== Comparación de Estrategias de Redondeo ===\n');

precios.forEach(precio => {
  console.log(`Precio original: ${precio.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 })}`);
  
  const strategies: Array<'charm' | 'hundred' | 'thousand' | 'auto'> = ['charm', 'hundred', 'thousand', 'auto'];
  
  strategies.forEach(strategy => {
    const rounded = roundPrice(precio, strategy);
    const formatted = formatRoundedPrice(precio, strategy);
    console.log(`  ${strategy.padEnd(8)}: ${formatted} (${rounded.toLocaleString('es-MX')})`);
  });
  
  console.log('');
});
