import { Spin, Typography } from 'antd';
import { useSearchParams } from 'react-router-dom';
import { GIFTS, ALL_KEYWORDS } from '@/config';
import useGiftStore, { getFrameUrl } from '@/stores/gifPlayerStore';
import { useEffect, useState } from 'react';
import { Api } from '@/api/api';

export default function Instruction({
  formType,
}: {
  formType: number | string;
}) {
  const [searchParams] = useSearchParams();
  const docId = searchParams.get('id') as keyof typeof GIFTS;
  const instruction = GIFTS[docId].instruction || '';
  const { frameReady, description } = useGiftStore();

  return (
    <div className="pb-6">
      <div className="border border-[#FFFFFF1F] rounded-2xl p-6">
        <NormalInstruction instruction={instruction} des={description} />
        {frameReady && formType === 2 && (
          <AiInstruction formType={formType} instruction={instruction} />
        )}
      </div>
    </div>
  );
}

function NormalInstruction({
  instruction,
  des,
}: {
  instruction: string;
  des: string;
}) {
  return (
    <>
      {instruction && (
        <div>
          <Typography.Title
            level={5}
            style={{ margin: 0, color: '#ffffff', marginBottom: 12 }}
          >
            Instruction
          </Typography.Title>
          <Typography.Paragraph
            ellipsis={{
              rows: 2,
              expandable: true,
            }}
          >
            {instruction
              ?.trim()
              .split(/[\s]+/)
              .map((word, index) => (
                <Typography.Text
                  underline={ALL_KEYWORDS.indexOf(word) !== -1}
                  className="text-white"
                  key={word + 'aa' + index}
                >
                  {word}{' '}
                </Typography.Text>
              ))}
          </Typography.Paragraph>
        </div>
      )}
      {des && (
        <div>
          <Typography.Title
            level={5}
            style={{ margin: 0, color: '#ffffff', marginTop: 24 }}
          >
            Description
          </Typography.Title>
          <Typography.Paragraph
            className="text-white"
            ellipsis={{
              rows: 2,
              expandable: true,
            }}
          >
            {des.charAt(0).toUpperCase() + des.slice(1)}
          </Typography.Paragraph>
        </div>
      )}
    </>
  );
}

function AiInstruction({
  formType,
  instruction,
}: {
  formType: number | string;
  instruction: string;
}) {
  const [loading, setLoading] = useState(false);
  const [referalKeywords, setReferalKeywords] = useState<string[]>([]);

  async function generateAiInstruction() {
    try {
      setLoading(true);
      const frameUrl = getFrameUrl();
      const res = await Api.analyzeImage(formType, frameUrl, instruction);
      if (res) {
        const regex = /\*\*\*([\s\S]*?)\*\*\*/;
        const match = res.match(regex);
        const keywords = match?.[1] || res;
        const referalKeywords = ALL_KEYWORDS.filter((word) =>
          keywords.includes(word)
        );
        setReferalKeywords(referalKeywords.slice(0, 8));
        console.log(referalKeywords, 'referalKeywords');
        // setAi(res);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    generateAiInstruction();
  }, []);
  return (
    <div className="border border-[#FFFFFF1F] rounded-2xl p-6 mt-6">
      <Typography.Title
        level={5}
        style={{
          margin: 0,
          color: '#ffffff',
        }}
      >
        Keywords
        <Typography.Text
          className="ml-2"
          style={{ color: '#BBBBBB', fontWeight: 'normal' }}
        >
          (for reference only)
        </Typography.Text>
      </Typography.Title>
      {loading ? (
        <div className="border border-[#FFFFFF1F] rounded-2xl p-6 mt-6 flex items-center justify-center">
          <Spin className="mr-4" /> Ai generating...
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-4">
          {referalKeywords.map((word, index) => (
            <div key={word + index}>
              {index > 0 && ' '}
              <Typography.Text
                copyable={true}
                className="text-white border border-[#FFFFFF1F] rounded-full px-4 py-1 flex items-center"
                key={word + index}
              >
                {word}
              </Typography.Text>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
