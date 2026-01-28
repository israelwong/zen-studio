/**
 * Tests unitarios para package-price-engine
 * 
 * Escenarios:
 * 1. Match de Horas → Precio Personalizado exacto
 * 2. Mismatch de Horas → Precio Recalculado + Charm
 * 3. Caso Null/0 → Precio Personalizado del paquete
 * 4. Sin precio personalizado → Precio recalculado + charm
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { calculatePackagePrice } from '../package-price-engine';
import type { PackagePriceEngineInput } from '../package-price-engine';

// Mock de calcularPrecio
const mockCalcularPrecio = jest.fn((costo, gasto, tipo, config) => ({
  precio_final: (costo + gasto) * 1.3, // Simplificado para tests
}));

jest.mock('@/lib/actions/studio/catalogo/calcular-precio', () => ({
  calcularPrecio: (...args: any[]) => mockCalcularPrecio(...args),
}));

// Mock de roundPrice
const mockRoundPrice = jest.fn((price, strategy) => {
  if (strategy === 'charm') {
    // Simulación simple de charm: redondear a múltiplo de 100 más cercano
    return Math.ceil(price / 100) * 100;
  }
  return price;
});

jest.mock('../price-rounding', () => ({
  roundPrice: (...args: any[]) => mockRoundPrice(...args),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('calculatePackagePrice', () => {
  const baseConfig = {
    utilidad_servicio: 0.30,
    utilidad_producto: 0.20,
    comision_venta: 0.10,
    sobreprecio: 0.05,
  };

  const basePaquete = {
    id: 'test-paquete',
    precio: 18000,
    base_hours: 7,
  };

  const baseItems = [
    {
      item_id: 'item-1',
      quantity: 1,
      precio_personalizado: null,
      items: {
        cost: 1000,
        expense: 200,
        utility_type: 'servicio',
      },
    },
  ];

  const baseCatalogo = [
    {
      categorias: [
        {
          servicios: [
            {
              id: 'item-1',
              billing_type: 'HOUR' as const,
            },
          ],
        },
      ],
    },
  ];

  it('Match de Horas: Event 7h vs Base 7h → Debe retornar Precio Personalizado exacto', () => {
    const input: PackagePriceEngineInput = {
      paquete: basePaquete,
      eventDurationHours: 7,
      paqueteItems: baseItems,
      catalogo: baseCatalogo,
      configPrecios: baseConfig,
    };

    const result = calculatePackagePrice(input);

    expect(result.finalPrice).toBe(18000); // Exacto, sin charm
    expect(result.hoursMatch).toBe(true);
    expect(result.priceSource).toBe('personalized');
    expect(result.basePrice).toBe(18000);
  });

  it('Mismatch de Horas: Event 8h vs Base 7h → Debe retornar Precio Recalculado + Charm', () => {
    const input: PackagePriceEngineInput = {
      paquete: basePaquete,
      eventDurationHours: 8,
      paqueteItems: baseItems,
      catalogo: baseCatalogo,
      configPrecios: baseConfig,
    };

    const result = calculatePackagePrice(input);

    // Precio recalculado: (1000 + 200) * 1.3 * 8 = 12480
    // Con charm: Math.ceil(12480 / 100) * 100 = 12500
    expect(result.finalPrice).toBe(12500); // Con charm aplicado
    expect(result.hoursMatch).toBe(false);
    expect(result.priceSource).toBe('recalculated');
    expect(result.recalculatedPrice).toBeGreaterThan(0);
  });

  it('Caso Null/0: Event null → Debe retornar Precio Personalizado del paquete', () => {
    const input: PackagePriceEngineInput = {
      paquete: basePaquete,
      eventDurationHours: null,
      paqueteItems: baseItems,
      catalogo: baseCatalogo,
      configPrecios: baseConfig,
    };

    const result = calculatePackagePrice(input);

    expect(result.finalPrice).toBe(18000); // Exacto, sin charm
    expect(result.hoursMatch).toBe(false); // No hay match porque no hay horas
    expect(result.priceSource).toBe('personalized');
  });

  it('Caso Sin Horas Base: Paquete sin base_hours → Debe usar precio personalizado', () => {
    const input: PackagePriceEngineInput = {
      paquete: {
        ...basePaquete,
        base_hours: null,
      },
      eventDurationHours: 7,
      paqueteItems: baseItems,
      catalogo: baseCatalogo,
      configPrecios: baseConfig,
    };

    const result = calculatePackagePrice(input);

    expect(result.finalPrice).toBe(18000); // Exacto, sin charm
    expect(result.priceSource).toBe('personalized');
  });

  it('Caso Sin Precio Personalizado: Solo recalculado → Debe usar recalculado + charm', () => {
    const input: PackagePriceEngineInput = {
      paquete: {
        ...basePaquete,
        precio: 0, // Sin precio personalizado
      },
      eventDurationHours: 7,
      paqueteItems: baseItems,
      catalogo: baseCatalogo,
      configPrecios: baseConfig,
    };

    const result = calculatePackagePrice(input);

    // Precio recalculado: (1000 + 200) * 1.3 * 7 = 10920
    // Con charm: Math.ceil(10920 / 100) * 100 = 11000
    expect(result.finalPrice).toBe(11000); // Con charm
    expect(result.priceSource).toBe('recalculated');
  });

  it('Caso Edge: Horas en 0 → Debe tratarse como null', () => {
    const input: PackagePriceEngineInput = {
      paquete: basePaquete,
      eventDurationHours: 0,
      paqueteItems: baseItems,
      catalogo: baseCatalogo,
      configPrecios: baseConfig,
    };

    const result = calculatePackagePrice(input);

    expect(result.finalPrice).toBe(18000); // Exacto, sin charm
    expect(result.priceSource).toBe('personalized');
  });

  it('Caso Edge: base_hours en 0 → Debe tratarse como null', () => {
    const input: PackagePriceEngineInput = {
      paquete: {
        ...basePaquete,
        base_hours: 0,
      },
      eventDurationHours: 7,
      paqueteItems: baseItems,
      catalogo: baseCatalogo,
      configPrecios: baseConfig,
    };

    const result = calculatePackagePrice(input);

    expect(result.finalPrice).toBe(18000); // Exacto, sin charm
    expect(result.priceSource).toBe('personalized');
  });

  it('Caso SERVICE billing_type: No debe multiplicar por horas', () => {
    const input: PackagePriceEngineInput = {
      paquete: basePaquete,
      eventDurationHours: 8,
      paqueteItems: baseItems,
      catalogo: [
        {
          categorias: [
            {
              servicios: [
                {
                  id: 'item-1',
                  billing_type: 'SERVICE' as const,
                },
              ],
            },
          ],
        },
      ],
      configPrecios: baseConfig,
    };

    const result = calculatePackagePrice(input);

    // SERVICE no se multiplica por horas, pero horas no coinciden
    // Precio recalculado: (1000 + 200) * 1.3 * 1 = 1560
    // Con charm: Math.ceil(1560 / 100) * 100 = 1600
    expect(result.finalPrice).toBe(1600); // Con charm
    expect(result.priceSource).toBe('recalculated');
  });
});
