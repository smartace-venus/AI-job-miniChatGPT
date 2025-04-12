import { type NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/server/supabase';
import { createAdminClient } from '@/lib/server/admin';
import React, { useState } from 'react';
export const dynamic = 'force-dynamic';

export const maxDuration = 60;

const supabaseAdmin = createAdminClient();

export async function POST(req: NextRequest) {
  try {
    // Check for Llama Cloud API key
    if (!process.env.LLAMA_CLOUD_API_KEY) {
      console.error('LLAMA_CLOUD_API_KEY is not configured');
      return NextResponse.json(
        { error: 'Server configuration error: LLAMA_CLOUD_API_KEY is missing' },
        { status: 500 }
      );
    }

    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'No active session found' },
        { status: 401 }
      );
    }

    const { file } = await req.json();

    try {
      const { data, error } = await supabaseAdmin.storage
        .from('userfiles')
        .download(file.path);

      if (error) {
        console.error('Error downloading file:', error);
        return NextResponse.json({
          file: file.name,
          status: 'error',
          message: 'Download failed'
        });
      }

      const formData = new FormData();
      formData.append('file', new Blob([data]), file.name);

      const uploadResponse = await fetch(
        'https://api.cloud.llamaindex.ai/api/v1/parsing/upload',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.LLAMA_CLOUD_API_KEY}`,
            Accept: 'application/json'
          },
          body: formData
        }
      );

      if (!uploadResponse.ok) {
        throw new Error(
          `Failed to upload file: ${uploadResponse.statusText}`
        );
      }

      const uploadResult = await uploadResponse.json();
      return NextResponse.json({
        file: file.name,
        status: 'success',
        jobId: uploadResult.id
      });
    } catch (error) {
      console.error(`Error processing file ${file.name}:`, error);
      return NextResponse.json({
        file: file.name,
        status: 'error',
        message: 'Processing failed'
      });
    }
  } catch (error) {
    console.error('Error in POST request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
