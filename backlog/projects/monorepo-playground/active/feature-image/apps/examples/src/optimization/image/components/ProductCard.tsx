import type {Product} from '@/shared/product/type';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({product}: ProductCardProps) {
  const isDiscounted = product.price.original > product.price.final;

  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
      <div style={{aspectRatio: '1 / 1', background: '#f5f5f5'}}>
        <img
          src={product.imageUrl}
          alt={product.name}
          style={{width: '100%', height: '100%', objectFit: 'cover', display: 'block'}}
        />
      </div>
      <div style={{display: 'flex', flexDirection: 'column', gap: 2}}>
        <span style={{fontSize: 12, color: '#888'}}>{product.brand.name}</span>
        <span style={{fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
          {product.name}
        </span>
        <div style={{display: 'flex', gap: 6, alignItems: 'baseline'}}>
          <span style={{fontSize: 14, fontWeight: 600}}>
            {product.price.final.toLocaleString()}원
          </span>
          {isDiscounted && (
            <span style={{fontSize: 12, color: '#aaa', textDecoration: 'line-through'}}>
              {product.price.original.toLocaleString()}원
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
