import { cn } from "@udecode/cn";

export default function SectionTags({
  className,
  caseName,
  tags,
  annotationNum,
}: {
  className?: string;
  caseName: string;
  tags: string[];
  annotationNum: number;
}) {
  return (
    <section className={cn("", className)}>
      <h2 className="font-bold text-xl">Healthcare Data</h2>
      <div className="bg-gray-9 rounded-2xl p-6 mt-4">
        <div className="flex items-center gap-4">
          {/* <NetworkIcon type="ethereum" size={24} className="flex-shrink-0" />
            <div className="flex-shrink-0 break-all flex-1 font-bold text-lg">
              0x9391Bf4beCF18B20d1567dBc53D3a80140bC6759
            </div> */}
          <div className="flex-shrink-0 break-all flex-1 font-bold text-lg">
            {caseName}
          </div>
        </div>
        <div className="mt-6 space-y-6 md:flex md:gap-[64px] md:space-y-0 md:items-start">
          <div className="md:flex-1">
            <div className="text-sm">Label</div>
            <div className="mt-3 flex flex-wrap gap-3">
              {tags?.map((t, index) => (
                <Label key={t + index}>{t}</Label>
              ))}
            </div>
          </div>
          <div className="md:flex-1">
            <div className="text-sm">Annotation_Number</div>
            <div className="mt-3 flex flex-wrap gap-3">
              <Label>{annotationNum}</Label>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="border border-solid border-gray-2 rounded-full text-sm py-[6px] px-4">
      {children}
    </span>
  );
}
