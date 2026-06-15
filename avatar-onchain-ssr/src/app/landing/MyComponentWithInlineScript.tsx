"use client";
import React, { useEffect } from "react";

const MyComponentWithInlineScript = ({params}: {params: Promise<{ record_id: string; media?: string | undefined }>}) => {
  useEffect(() => {
    if (!params) return;
    (async () => {
      const { record_id } = await params;
      window.location.href = `/mint/success/${record_id}`;
    })();
  }, [params]);
  return <></>;
};

export default MyComponentWithInlineScript;
