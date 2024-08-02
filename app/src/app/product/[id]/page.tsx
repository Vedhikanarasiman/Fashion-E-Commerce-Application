import { supabase } from '../../lib/supabase'
import { Product } from '../../types'
import Link from 'next/link'
import Image from 'next/image'

export default async function ProductPage({ params }: { params: { id: string } }) {
  const { data: product, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error) {
    console.error('Error fetching product:', error)
    return <div>Error loading product</div>
  }

  const { data: relatedProducts, error: relatedError } = await supabase
    .from('products')
    .select('*')
    .eq('category', product.category)
    .neq('id', product.id)
    .limit(3)

  if (relatedError) {
    console.error('Error fetching related products:', relatedError)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Link href="/" className="text-blue-500 hover:underline mb-4 inline-block">
        &larr; Back to Home
      </Link>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <Image 
          src={product.image_url} 
          alt={product.name} 
          width={600} 
          height={600} 
          className="w-full h-auto object-cover rounded-lg"
        />
        <div>
          <h1 className="text-3xl font-bold mb-4">{product.name}</h1>
          <p className="text-xl font-semibold mb-4">${product.price.toFixed(2)}</p>
          <p className="text-gray-600 mb-6">{product.description}</p>
          <button className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600">
            Add to Cart
          </button>
        </div>
      </div>
      
      {relatedProducts && relatedProducts.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold mb-4">Related Products</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {relatedProducts.map((product: Product) => (
              <Link href={`/product/${product.id}`} key={product.id}>
                <div className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
                  <Image 
                    src={product.image_url} 
                    alt={product.name} 
                    width={300} 
                    height={300} 
                    className="w-full h-48 object-cover mb-4"
                  />
                  <h3 className="text-lg font-semibold">{product.name}</h3>
                  <p className="text-gray-600">${product.price.toFixed(2)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}