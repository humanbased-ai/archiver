import { cn } from "@udecode/cn";

import ToolTip from "../tooltip";
import Avatar from "../avatar";

import { getAsciiSum } from "~/utils/str";

type TPerson = {
  name: string;
  avatar: string;
  email?: string;
  id?: number;
};

export default function SectionContributors({
  className,
  annotators,
  validators,
}: {
  className?: string;
  annotators: TPerson[];
  validators: TPerson[];
}) {
  return (
    <section className={cn("", className)}>
      <h2 className="font-bold text-xl flex items-center">
        <span className="mr-2">Contributors</span>
        <ToolTip tip="All users who have contributed to the data." />
      </h2>
      <div className="bg-gray-9 rounded-2xl p-6 mt-4">
        <div>
          <h3 className="font-bold text-base flex items-center">
            <span className="mr-2">Submiters</span>
            <ToolTip tip="Users who have submitted label info and successfully passed verification." />
          </h3>
          <Actors actors={annotators} onlySenior={false} />
        </div>
        <div className="mt-6">
          <h3 className="font-bold text-base flex items-center">
            <span className="mr-2">Validators</span>
            <ToolTip tip="Users who have verified the data and whose decision was accepted by the platform" />
          </h3>
          <Actors actors={validators} onlySenior={true} />
        </div>
      </div>
    </section>
  );
}

function Actors({
  actors,
  onlySenior,
}: {
  actors: TPerson[];
  onlySenior?: boolean;
}) {
  const getName = (params: TPerson) => {
    if (params.name && !params.email) return params.name;

    const rand = getAsciiSum(params.email + params.name) % 2;

    return rand === 0 ? params.email! : params.name;
  };

  return (
    <div className="p-4 rounded-xl border border-[#FFFFFF1F] border-solid mt-4">
      {!actors.length ? (
        <p className="text-center text-sm">No Data</p>
      ) : (
        <div className="flex items-center flex-wrap gap-y-6">
          {actors.map((p, index) => (
            <Person
              name={getName(p)}
              avatar={p.avatar}
              key={index + p.name}
              onlySenior={onlySenior}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Person({
  name,
  avatar,
  onlySenior,
}: {
  name: string;
  avatar?: string;
  onlySenior?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 pr-3 md:w-1/3 md:pr-6 sm:w-1/2 w-full lg:w-1/4">
      <Avatar
        className="flex-shrink-0"
        name={name}
        url={avatar}
        onlySenior={onlySenior}
      />
      <span className="text-base flex-1 truncate">{name}</span>
    </div>
  );
}
