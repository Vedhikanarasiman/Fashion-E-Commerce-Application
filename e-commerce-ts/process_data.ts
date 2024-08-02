import fs from 'fs'
import path from 'path'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import axios from 'axios'
import dotenv from 'dotenv'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { HfInference } from '@huggingface/inference'

dotenv.config()

interface FashionItem {
  id: number
  name: string
  category: string
  description: string
  price: number
}

interface ProcessedFashionItem extends FashionItem {
  image_url: string
  embedding: number[]
}

const supabase: SupabaseClient = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
)

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!)
const hf = new HfInference(process.env.HF_key)

async function generateImage(prompt: string): Promise<Buffer> {
  try {
    const result = await hf.textToImage({
      inputs: prompt,
      model: "stabilityai/stable-diffusion-3-medium-diffusers",
      parameters: {
        negative_prompt: "blurry, bad",
        num_inference_steps: 28,
        guidance_scale: 7.0
      }
    });

    const arrayBuffer = await result.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error('Error generating image:', error);
    // Return a placeholder image buffer
    return getPlaceholderImage(prompt);
  }
}

function getPlaceholderImage(prompt: string): Buffer {
  const encodedPrompt = encodeURIComponent(prompt.slice(0, 30));
  const placeholderUrl = `https://via.placeholder.com/300x300.png?text=${encodedPrompt}`;
  return Buffer.from(`Placeholder: ${placeholderUrl}`);
}

async function generateEmbedding(text: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
  const result = await model.embedContent(text);
  //console.log(JSON.stringify(result, null, 2)); 
  const embedding = result.embedding;
  return embedding.values;  // Extract the numeric array
}


async function processItem(item: FashionItem): Promise<void> {
  try {
    console.log(`Processing item: ${item.name}`);

    const embedding = await generateEmbedding(item.description);

    const imagePrompt = `High quality product image of ${item.name}: ${item.description}`;
    const imageBuffer = await generateImage(imagePrompt);

    const { data, error } = await supabase.storage
      .from('product-images')  // Changed to 'product-images'
      .upload(`${item.id}.png`, imageBuffer, {
        upsert: true,
        contentType: 'image/png',
      });

    if (error) {
      console.error('Error uploading image:', error);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from('product-images')  // Changed to 'product-images'
      .getPublicUrl(`${item.id}.png`);

    const processedItem: ProcessedFashionItem = {
      ...item,
      image_url: publicUrlData.publicUrl,
      embedding,
    };

    const { data: insertData, error: insertError } = await supabase
      .from('products')  // Changed to 'products'
      .upsert(processedItem);

    if (insertError) {
      console.error('Error inserting data:', insertError);
    } else {
      console.log(`Processed item ${item.id} successfully`);
    }
  } catch (error) {
    console.error(`Error processing item ${item.id}:`, error);
  }
}

async function main(): Promise<void> {
  try {
    const rawData = fs.readFileSync('fashion_data.json', 'utf8');
    const jsonData = JSON.parse(rawData);

    if (!jsonData.products || !Array.isArray(jsonData.products)) {
      console.error('Error: The JSON data does not contain a products array. Actual data:', jsonData);
      return;
    }

    const fashionItems: FashionItem[] = jsonData.products
      .slice(0, 25)  // Process all 50 items
      .map((item: any, index: number) => {
        if (typeof item.id !== 'number' ||
            typeof item.name !== 'string' ||
            typeof item.category !== 'string' ||
            typeof item.description !== 'string' ||
            typeof item.price !== 'number') {
          console.error(`Error: Item at index ${index} does not conform to FashionItem interface:`, item);
          throw new Error(`Invalid item at index ${index}`);
        }
        return item as FashionItem;
      });

    for (const item of fashionItems) {
      await processItem(item);
      // Add a delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log('Processing complete');
  } catch (error) {
    console.error('An error occurred in main:', error);
  }
}

main().catch(console.error);