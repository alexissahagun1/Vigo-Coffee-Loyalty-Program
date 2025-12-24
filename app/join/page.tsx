import { JoinLoyaltyForm } from "@/components/join-loyalty-form";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 bg-gradient-to-br from-amber-50 to-orange-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-amber-900 mb-2">Vigo Coffee</h1>
          <p className="text-amber-700">Join our loyalty program</p>
        </div>
        <JoinLoyaltyForm />
      </div>
    </div>
  );
}