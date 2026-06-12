import Header from "~/components/header";
import Footer from "~/components/footer";

import notFoundIcon from "~/assets/svg/not-found-icon.svg";

export default function NotFound() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header className="section w-full" />
      <div className="flex-1 flex items-center justify-center section w-full">
        <div className="text-center">
          <img
            src={notFoundIcon}
            className="w-[120px] mx-auto"
            alt="Not Found"
          />
          <p className="mt-6 text-gray-5 text-base">No Data Found</p>
        </div>
      </div>
      <Footer className="mt-10 section w-full" />
    </div>
  );
}
