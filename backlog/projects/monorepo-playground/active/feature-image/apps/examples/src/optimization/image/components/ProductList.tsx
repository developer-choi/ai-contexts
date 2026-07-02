'use client';

import {useQuery} from '@tanstack/react-query';
import {getProductsApi} from '@/shared/product/api';
import {ProductCard} from './ProductCard';

export default function ProductList() {
  const {data} = useQuery({
    queryKey: ['products'],
    queryFn: () => getProductsApi({page: 1, limit: 24}),
  });

  const products = data?.items ?? [];

  return (
    <div style={{maxWidth: 1800, margin: '0 auto', padding: '0 16px'}}>
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16}}>
        {products.map(product => (
          <ProductCard key={product.code} product={product} />
        ))}
      </div>
    </div>
  );
}
