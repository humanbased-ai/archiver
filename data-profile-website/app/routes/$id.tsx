import { redirect, useLoaderData } from "@remix-run/react";
import { LoaderFunctionArgs } from "@remix-run/node";
import invariant from "tiny-invariant";

import Header from "~/components/header";
import Footer from "~/components/footer";
import SectionDiagnosis from "~/components/sections/section-diagnosis";
import SectionTags from "~/components/sections/section-tags";
import SectionContributors from "~/components/sections/section-contributors";

import { DATA_API_PATH } from "~/configs";

export const loader = async ({ params }: LoaderFunctionArgs) => {
  invariant(params.id, "Missing id param");
  let status;
  let data;

  try {
    const response = await fetch(DATA_API_PATH, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        meta_id: params.id,
      }),
    });
    status = response.status;
    if (response.ok) {
      data = await response.json();

      console.log("data", data);

      if (data.errorCode !== 0) {
        data = null;
      }
    }
  } catch (e) {
    status = 500;
  }

  if (!data) return redirect(`/not-found?id=${params.id}`);

  return data;
};

export default function Page() {
  const { data } = useLoaderData<typeof loader>();
  const caseName = data?.case_name;
  const tags = data?.mark_tag ? [data?.mark_tag] : [];
  const annotationNum = data?.roi_number || 0;
  const organName = data?.organ_name;
  const markContent = data?.mark_content;
  const markImg = data?.image_url;
  const annotators = data?.ext_info?.annotators || [];
  const validators = data?.ext_info?.validators || [];

  return (
    <div className="min-h-screen">
      <Header className="section w-full" />
      <div className="mt-10 space-y-10 section w-full">
        <SectionTags
          className=""
          tags={tags}
          caseName={caseName}
          annotationNum={annotationNum}
        />
        <SectionDiagnosis
          className=""
          organName={organName}
          markImg={markImg}
          markContent={markContent}
        />
        <SectionContributors
          className=""
          annotators={annotators}
          validators={validators}
        />
      </div>
      <Footer className="mt-10 section w-full" />
    </div>
  );
}
