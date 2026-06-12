// import binanceApi from "@/apis/binance.api";
import Footer from "@/components/v3/footer";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import list from "@/apis/binance-contributors";

type CssVars = React.CSSProperties & { [key: string]: string | number };
const PAGE_SIZE = 160;

// function generateMockAddresses(count: number): string[] {
//   const addresses: string[] = [];
//   for (let index = 0; index < count; index += 1) {
//     const seed = (index * 2654435761) >>> 0;
//     const hex = seed.toString(16).repeat(10).slice(0, 40);
//     addresses.push(`0x${hex}`);
//   }
//   return addresses;
// }

function maskAddress(address: string): { s: string; a: string } {
  if (!address.startsWith("0x")) return { s: address, a: address };
  const body = address.slice(2);
  if (body.length <= 8) return { s: address, a: address };
  return { s: `0x${body.slice(0, 4)}…${body.slice(-4)}`, a: address };
}

function RowMarquee(props: {
  addresses: string[];
  speedSeconds: number;
  reverse?: boolean;
  startOffsetSeconds?: number;
  itemRevealStartIndex?: number;
  itemStaggerSeconds?: number;
}) {
  const {
    addresses,
    speedSeconds,
    reverse = false,
    startOffsetSeconds = 0,
    itemRevealStartIndex = 0,
    itemStaggerSeconds = 0.02,
  } = props;

  const masked = useMemo(() => addresses.map(maskAddress), [addresses]);
  const rowDuration = `${speedSeconds}s`;
  const delay = `${-Math.abs(startOffsetSeconds)}s`;

  const animationStyle: CssVars = {
    animation: `marquee-x ${rowDuration} linear infinite`,
    animationDelay: delay,
    animationDirection: reverse ? ("reverse" as const) : ("normal" as const),
  } as CssVars;

  function handleAddressClick(addr: string) {
    window.open(`https://bscscan.com/address/${addr}`);
  }

  return (
    <div className="relative h-10 select-none md:h-14">
      <div className="absolute inset-0 [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
        <div className="flex w-max gap-3 will-change-transform md:gap-4" style={animationStyle}>
          <div className="flex w-max gap-3 md:gap-4">
            {masked.map((addr, idx) => {
              const delaySeconds = (itemRevealStartIndex + idx) * itemStaggerSeconds;
              return (
                <span
                  onClick={() => handleAddressClick(addr.a)}
                  key={`a-${idx}`}
                  className="cursor-pointer whitespace-nowrap rounded-full border border-black/10 px-4 py-1.5 text-sm text-black/90 shadow-sm transition-all hover:bg-black hover:text-white hover:shadow md:px-8 md:py-3 md:text-base"
                  style={{
                    opacity: 0,
                    animation: `item-reveal 700ms ease-out both`,
                    animationDelay: `${delaySeconds}s`,
                  }}
                >
                  {addr.s}
                </span>
              );
            })}
          </div>
          <div className="flex w-max gap-3 md:gap-4">
            {masked.map((addr, idx) => {
              const delaySeconds = (itemRevealStartIndex + idx + masked.length) * itemStaggerSeconds;
              return (
                <span
                  onClick={() => handleAddressClick(addr.a)}
                  key={`b-${idx}`}
                  className="cursor-pointer whitespace-nowrap rounded-full border border-black/10 px-4 py-1.5 text-sm text-black/90 shadow-sm transition-all hover:bg-black hover:text-white hover:shadow md:px-8 md:py-3 md:text-base"
                  style={{
                    opacity: 0,
                    animation: `item-reveal 700ms ease-out both`,
                    animationDelay: `${delaySeconds}s`,
                  }}
                >
                  {addr.s}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard(props: { label: string; value: string; suffix?: string }) {
  const { label, value, suffix } = props;
  return (
    <div className="relative rounded-sm bg-black p-6">
      <div className="text-3xl font-semibold tracking-tight text-black md:text-5xl">
        <span className="tabular-nums text-white">{value}</span>
        {suffix ? <span className="text-white">{suffix}</span> : null}
      </div>
      <div className="rounded-xs mt-4 inline-block bg-[#FCA800] px-2 text-base font-semibold leading-8">{label}</div>
      <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/20 [mask-image:radial-gradient(180px_60px_at_10%_0%,black,transparent)]" />
    </div>
  );
}

function formatNumber(value: number): string {
  try {
    return value.toLocaleString();
  } catch {
    return String(value);
  }
}

// removed rotateArray: server-side paging is used

export default function BoosterContributorsPage() {
  const [addresses, setAddresses] = useState<string[]>([]);
  const location = useLocation();
  // const navigate = useNavigate();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);

  const [page, setPage] = useState<number>(() => {
    const initial = Number(searchParams.get("page") ?? 1);
    return Number.isFinite(initial) && initial > 0 ? initial : 1;
  });

  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    const qp = Number(sp.get("page") ?? 1);
    if (Number.isFinite(qp) && qp !== page) setPage(qp);
  }, [location.search]);

  async function getAddress(page: number) {
    const start = (page - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    setAddresses(list.slice(start, end));
  }

  useEffect(() => {
    getAddress(page);
  }, [page]);

  const slicedRows = useMemo(() => {
    const rows = 10;
    if (addresses.length === 0) return Array.from({ length: rows }, () => [] as string[]);
    const addressesPerRow = Math.ceil(addresses.length / rows);
    const result: string[][] = Array.from({ length: rows }, (_, rowIndex) => {
      const start = rowIndex * addressesPerRow;
      const end = start + addressesPerRow;
      const segment = addresses.slice(start, end);
      if (segment.length < addressesPerRow) {
        const needed = addressesPerRow - segment.length;
        return [...segment, ...addresses.slice(0, needed)];
      }
      return segment;
    });
    return result;
  }, [addresses]);

  // const isLastPage = addresses.length < PAGE_SIZE;

  // const participantsDefault = addresses.length;
  // const submissionsDefault = Math.max(participantsDefault * 5, participantsDefault + 20);

  // const usersTarget = Number(searchParams.get("users") ?? participantsDefault);
  // const submissionsTarget = Number(searchParams.get("submissions") ?? submissionsDefault);

  const usersCount = 86647;
  const submissionsCount = 1256067;

  function handleNextPage() {
    setPage((page) => page + 1);
  }

  function handlePreviousPage() {
    if (page === 1) return;
    setPage((page) => page - 1);
  }

  return (
    <div className="min-h-screen bg-warm font-sora text-black lg:pt-[72px]">
      <div className="section mx-auto px-4 py-10 md:px-8 md:py-16">
        <h1 className="text-[60px] font-bold leading-none tracking-tighter lg:text-[68px] lg:leading-[96px]">
          Binance Booster <br />
          Codatta Food Annotation Contributors
        </h1>

        <div className="mt-6 grid grid-cols-2 gap-3 md:mt-8 md:gap-4 lg:max-w-3xl">
          <MetricCard label="Total Contributors" value={formatNumber(usersCount)} suffix="+" />
          <MetricCard label="Total Submissions" value={formatNumber(submissionsCount)} suffix="+" />
        </div>
      </div>

      <div className="relative mb-10 w-full overflow-hidden">
        <div className="mx-auto px-4 md:px-8">
          <div className="grid gap-3 md:gap-4">
            {slicedRows.map((rowAddresses, index) => (
              <RowMarquee
                key={`${index}-${page}`}
                addresses={rowAddresses}
                speedSeconds={40 + (index % 6) * 8}
                reverse={index % 2 === 1}
                startOffsetSeconds={index * 2}
                itemRevealStartIndex={index * 4}
                itemStaggerSeconds={0.02}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto mb-8 flex max-w-7xl items-center justify-center gap-4 px-4 md:mb-12 md:px-8">
        <button
          className="rounded-full border border-black/10 bg-white px-6 py-3 text-base font-medium text-black shadow-sm hover:bg-black hover:text-white md:px-8 md:py-3.5 md:text-lg"
          onClick={handlePreviousPage}
        >
          Previous
        </button>
        <span className="inline-block w-[80px] select-none text-center text-base text-black/60 md:text-lg">{page}</span>
        <button
          className="rounded-full border border-black/10 bg-white px-6 py-3 text-base font-medium text-black shadow-sm hover:bg-black hover:text-white md:px-8 md:py-3.5 md:text-lg"
          onClick={handleNextPage}
        >
          Next
        </button>
      </div>

      <style>{`
        @keyframes marquee-x {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @keyframes item-reveal {
          0% { opacity: 0; transform: translateY(4px); filter: blur(1px); }
          60% { opacity: 1; transform: translateY(0); filter: blur(0); }
          100% { opacity: 1; }
        }
      `}</style>

      <Footer />
    </div>
  );
}
