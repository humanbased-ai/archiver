import { GradientButton } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export function Component() {

  const navigate = useNavigate()

  return <div className="flex flex-col gap-4 h-full w-full items-center justify-center text-xl text-white">
    <span>Page not found</span>
    <GradientButton className="w-[240px]" onClick={()=>navigate('/')}>Go Home</GradientButton>
  </div>
  
}