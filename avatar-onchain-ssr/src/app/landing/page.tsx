import { Metadata } from "next";
import MyComponentWithInlineScript from "./MyComponentWithInlineScript";

const API_HOST = process.env.VITE_ENV === 'production' ? 'https://thearp.ai' : 'https://test.thearp.ai';

type Props = {
  params: Promise<{ record_id: string; media?: string }>;
  searchParams: Promise<{ record_id: string; media?: string }>;
};

export async function generateMetadata(
  { searchParams }: Props,
): Promise<Metadata> {
  const { record_id } = await searchParams;
  console.log('get metadata for record_id:', record_id);

  try {
    const data = await fetchData(record_id ?? "");
    console.log('get metadata for record_id:', record_id, data.data, data.code);
    if (data?.code === 0) {
      console.log('metadata', {title: 'artometa'})

      return {
        title: 'Artometa',
        description: 'Discover the future of digital identity at https://thearp.ai/! Create your unique AI-generated avatar and mint it as an NFT. Join the revolution of personalized digital art and blockchain technology.',
        twitter: {
          card: "summary_large_image",
          title: 'Artometa',
          images: data?.data?.image_url ? [{ url: data.data.image_url }] : [],
        }
      }
    } else {
      return {
        title: "Artometa",
        description: 'Discover the future of digital identity at https://thearp.ai/! Create your unique AI-generated avatar and mint it as an NFT. Join the revolution of personalized digital art and blockchain technology.',
      };
    }
  } catch (error) {
    console.error("Generate meta data failed:", error);
    return {
      title: "Artometa",
      description: 'Discover the future of digital identity at https://thearp.ai/! Create your unique AI-generated avatar and mint it as an NFT. Join the revolution of personalized digital art and blockchain technology.',
    };
  }
}

async function fetchData(record_id: string): Promise<{
  code: number;
  data: {
    image_url: string;
    record_id: number;
  };
}> {
  const apiUrl = `${API_HOST}/api/art/avatar/get?record_id=${record_id}`;

  const res = await fetch(apiUrl);
  if (!res.ok) {
    throw new Error(`fetch data failed: ${res.status}`);
  }

  return res.json();
}

export default function LandingPage({ searchParams }: Props) {
  return <MyComponentWithInlineScript params={searchParams} />;
}
