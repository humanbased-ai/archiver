import { cn } from "@udecode/cn";
import { useEffect, useState } from "react";

import closeIcon from "~/assets/svg/close-circle-icon.svg?url";
import scaleIcon from "~/assets/svg/scale-icon.svg?url";

export default function SectionDiagnosis({
  className,
  markImg,
  organName,
  markContent,
}: {
  className?: string;
  organName: string;
  markImg: string;
  markContent: string;
}) {
  const [show, setShow] = useState<boolean>(false);

  useEffect(() => {
    document.body.style.overflow = show ? "hidden" : "unset";

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [show]);

  return (
    <>
      <section className={cn("", className)}>
        <div className="bg-gray-9 rounded-2xl p-6 flex gap-10 flex-col md:flex-row">
          <div className="flex-1 rounded-2xl md:bg-[#1C1C2666] overflow-hidden relative">
            <div className="md:max-h-[360px] md:max-w-full w-full h-full">
              <img
                src={markImg}
                className=" cursor-pointer max-w-full max-h-full rounded-xl overflow-hidden m-auto md:rounded-none"
                onClick={() => setShow(true)}
              />
            </div>
            <div
              className="absolute right-[14px] bottom-[14px] w-8 h-8 bg-center bg-no-repeat bg-cover cursor-pointer hidden md:block"
              style={{ backgroundImage: `url(${scaleIcon ?? ""})` }}
              onClick={() => setShow(true)}
            ></div>
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-base">Diagnosis</h3>
            <p className="mt-3 text-sm">{markContent}</p>
          </div>
        </div>
      </section>
      <div
        className={cn(
          "fixed top-0 left-0 right-0 bottom-0 bg-[#000000CC]  !mt-0 !mx-0 z-10",
          show ? "block" : "hidden"
        )}
        onClick={() => setShow(false)}
      >
        <div className="section py-6 h-full flex items-center justify-center m-auto flex-col gap-5">
          <img
            className="max-w-full max-h-[calc(100vh-100px)] rounded-3xl overflow-hidden"
            src={markImg}
          />
          <div
            className="w-6 h-6 bg-center bg-no-repeat bg-cover cursor-pointer"
            style={{ backgroundImage: `url(${closeIcon ?? ""})` }}
          ></div>
        </div>
      </div>
    </>
  );
}
