import { JoinLoyaltyForm } from "@/components/join-loyalty-form";
import Image from "next/image";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 bg-gradient-to-br from-amber-50 to-orange-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          {/* Logo */}
          <div className="flex justify-center mb-4">
            <div className="relative w-32 h-32 md:w-40 md:h-40">
              <Image
                src="/assets/vigo-logo.jpg"
                alt="Vigo Coffee Logo"
                fill
                className="object-contain rounded-full"
                priority
              />
            </div>
          </div>
          
          {/* Branding Text */}
          <h1 className="text-4xl md:text-5xl uppercase font-bold text-amber-900 mb-3">
            Vigo Coffee
          </h1>
          <p className="text-lg md:text-xl text-amber-700 font-medium mb-2">
            Join our loyalty program
          </p>
          <p className="text-sm text-amber-600">
            Earn points with every purchase
          </p>
        </div>
        <JoinLoyaltyForm />
      </div>
    </div>
  );
}