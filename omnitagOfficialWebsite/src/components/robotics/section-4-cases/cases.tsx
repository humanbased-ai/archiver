import React from "react";
import { BigPlayButton, ControlBar, Player } from "video-react";

interface CaseProps {
  description: string;
  image: string;
}

const submissionCases: CaseProps[] = [
  {
    description: "Use the robot's appendage to flip the card over",
    image: "/images/robotics/submission-1.png",
  },
  {
    description: "Use the robot's appendage to flip the card over",
    image: "/images/robotics/submission-2.png",
  },
  {
    description: "Tilt the platform to make the ball roll into the hole",
    image: "/images/robotics/submission-3.png",
  },
];

const validationCases: CaseProps[] = [
  {
    description: "Use the robot's appendage to flip the card over",
    image: "/images/robotics/validation-1.png",
  },
  {
    description: "JLJLKJLKJLK",
    image: "/images/robotics/validation-2.png",
  },
  {
    description: "JLJLKJLKJLK",
    image: "/images/robotics/validation-3.png",
  },
];

const video = {
  image: "https://static.codatta.io/static/images/robotics-l1-20250109-100820.jpeg",
  url: "https://static.codatta.io/static/video/robotics-l1-20250108-114248.mp4",
};
const Cases: React.FC = () => {
  return (
    <section className="mt-16 rounded-xl bg-white px-3 py-6 text-black lg:px-8 lg:py-16">
      <h2 className="mb-3 text-xl font-bold">How to earn rewards？</h2>

      <div className="overflow-hidden rounded-2xl">
        <Player src={video.url} poster={video.image}>
          <BigPlayButton position="center" />
          <ControlBar autoHide={true} />
        </Player>
      </div>

      <div className="space-y-8 lg:space-y-12">
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xl font-bold">Submission</h3>
            <button className="text-sm text-gray-600 hover:text-black">View More</button>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {submissionCases.map((caseItem, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-xl bg-white shadow-sm transition-transform hover:-translate-y-1 hover:shadow-md"
              >
                <img src={caseItem.image} alt={caseItem.description} className="aspect-video w-full object-cover" />
                <p className="p-4 text-sm leading-relaxed text-gray-700">{caseItem.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xl font-bold">Validation</h3>
            <button className="text-sm text-gray-600 hover:text-black">View More</button>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {validationCases.map((caseItem, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-xl bg-white shadow-sm transition-transform hover:-translate-y-1 hover:shadow-md"
              >
                <img src={caseItem.image} alt={caseItem.description} className="aspect-video w-full object-cover" />
                <p className="p-4 text-sm leading-relaxed text-gray-700">{caseItem.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Cases;
