import { supabase } from '@/app/lib/supabase'
import { Product } from '@/app/types'
import Link from 'next/link'
import Image from 'next/image'

export default async function Home() {
  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    console.log('data: ',products)
    
  
  if (error) {
    console.error('Error fetching products:', error)
    return <div>Error loading products</div>
  }

  const categories = Array.from(new Set(products.map(p => p.category)))

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Fashion Brand</h1>
      
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Categories</h2>
        <div className="flex flex-wrap gap-4">
          {categories.map((category) => (
            <button
              key={category}
              className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300"
            >
              {category}
            </button>
          ))}
        </div>
      </div>
      
      <div>
        <h2 className="text-2xl font-semibold mb-4">Products</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((product: Product) => (
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
    </div>
  )
}