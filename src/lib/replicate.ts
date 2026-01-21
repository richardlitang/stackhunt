/**
 * Replicate Integration for OG Image Generation
 *
 * Uses Flux-schnell model to generate high-quality OG images for tools.
 * Images are uploaded to Supabase Storage.
 */

import Replicate from 'replicate';
import { getAdminClient } from './supabase';

// Initialize Replicate client
function getReplicateClient(): Replicate {
  const apiToken = import.meta.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_TOKEN;
  if (!apiToken) {
    throw new Error('REPLICATE_API_TOKEN is not configured');
  }
  return new Replicate({ auth: apiToken });
}

// OG Image generation config
const OG_IMAGE_CONFIG = {
  width: 1200,
  height: 630,
  model: 'black-forest-labs/flux-schnell' as const,
};

export interface OGImageResult {
  url: string;
  storagePath?: string;
  prompt: string;
}

/**
 * Generate an OG image for a tool using Flux
 */
export async function generateToolOGImage(
  toolName: string,
  toolSlug: string,
  options?: {
    style?: 'futuristic' | 'minimal' | 'gradient';
    tagline?: string;
  }
): Promise<OGImageResult> {
  const replicate = getReplicateClient();
  const style = options?.style || 'futuristic';

  // Build prompt based on style
  const prompts: Record<string, string> = {
    futuristic: `Futuristic high-tech software UI card design. Left side shows "${toolName}" logo placeholder with glowing neon accent. Right side displays "StackHunt Analysis" badge. Dark mode interface with subtle grid pattern. Cyan and purple neon glow effects. Clean minimalist tech aesthetic. 16:9 aspect ratio. Professional software comparison visualization. No text, icon-focused design.`,
    minimal: `Clean minimalist software card design. Split layout with "${toolName}" branding area on left, "Analysis" indicator on right. White and slate gray palette with single accent color. Subtle shadows and modern typography placeholder. Professional SaaS aesthetic. 16:9 aspect ratio.`,
    gradient: `Modern gradient software card. Smooth purple to blue gradient background. Centered glassmorphism card showing "${toolName}" with subtle glow. "Reviewed by StackHunt" badge in corner. Soft lighting, premium tech feel. 16:9 aspect ratio.`,
  };

  const prompt = prompts[style];

  try {
    // Run Flux model
    const output = await replicate.run(OG_IMAGE_CONFIG.model, {
      input: {
        prompt,
        width: OG_IMAGE_CONFIG.width,
        height: OG_IMAGE_CONFIG.height,
        num_outputs: 1,
        num_inference_steps: 4, // Flux-schnell is optimized for fewer steps
        go_fast: true,
      },
    });

    // Output is an array of URLs
    const imageUrl = Array.isArray(output) ? output[0] : output;

    if (!imageUrl || typeof imageUrl !== 'string') {
      throw new Error('No image URL returned from Replicate');
    }

    // Optionally upload to Supabase Storage
    let storagePath: string | undefined;
    try {
      storagePath = await uploadToSupabaseStorage(imageUrl, toolSlug);
    } catch (uploadErr) {
      console.warn('Failed to upload to Supabase Storage, using Replicate URL:', uploadErr);
    }

    return {
      url: storagePath ? getSupabasePublicUrl(storagePath) : imageUrl,
      storagePath,
      prompt,
    };
  } catch (error) {
    console.error('Replicate image generation failed:', error);
    throw error;
  }
}

/**
 * Generate an OG image for a comparison page
 */
export async function generateComparisonOGImage(
  toolA: string,
  toolB: string
): Promise<OGImageResult> {
  const replicate = getReplicateClient();

  const prompt = `Futuristic split-screen comparison card design. Left panel shows "${toolA}" with blue-cyan glow. Right panel shows "${toolB}" with purple-magenta glow. Center divider with "VS" badge. Dark mode UI with neon grid lines. High-tech software comparison visualization. Professional tech aesthetic. 16:9 aspect ratio. No text, abstract icon representation.`;

  try {
    const output = await replicate.run(OG_IMAGE_CONFIG.model, {
      input: {
        prompt,
        width: OG_IMAGE_CONFIG.width,
        height: OG_IMAGE_CONFIG.height,
        num_outputs: 1,
        num_inference_steps: 4,
        go_fast: true,
      },
    });

    const imageUrl = Array.isArray(output) ? output[0] : output;

    if (!imageUrl || typeof imageUrl !== 'string') {
      throw new Error('No image URL returned from Replicate');
    }

    // Upload to storage
    const slug = `${toolA.toLowerCase()}-vs-${toolB.toLowerCase()}`.replace(/\s+/g, '-');
    let storagePath: string | undefined;
    try {
      storagePath = await uploadToSupabaseStorage(imageUrl, `compare/${slug}`);
    } catch (uploadErr) {
      console.warn('Failed to upload comparison image:', uploadErr);
    }

    return {
      url: storagePath ? getSupabasePublicUrl(storagePath) : imageUrl,
      storagePath,
      prompt,
    };
  } catch (error) {
    console.error('Comparison image generation failed:', error);
    throw error;
  }
}

/**
 * Upload image from URL to Supabase Storage
 */
async function uploadToSupabaseStorage(
  imageUrl: string,
  slug: string
): Promise<string> {
  const admin = getAdminClient();

  // Fetch the image
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }

  const blob = await response.blob();
  const buffer = await blob.arrayBuffer();

  // Upload to Supabase Storage
  const path = `og-images/${slug}.webp`;
  const { error } = await admin.storage
    .from('public')
    .upload(path, buffer, {
      contentType: 'image/webp',
      upsert: true,
    });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  return path;
}

/**
 * Get public URL for Supabase Storage path
 */
function getSupabasePublicUrl(path: string): string {
  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
  return `${supabaseUrl}/storage/v1/object/public/public/${path}`;
}

/**
 * Update tool's OG image in database
 */
export async function updateToolOGImage(
  toolId: string,
  imageUrl: string
): Promise<void> {
  const admin = getAdminClient();

  const { error } = await admin
    .from('tools')
    .update({ og_image_url: imageUrl })
    .eq('id', toolId);

  if (error) {
    throw new Error(`Failed to update tool OG image: ${error.message}`);
  }
}
