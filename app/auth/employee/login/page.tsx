import { EmployeeLoginForm } from "@/components/employee-login-form";

export default function EmployeeLoginPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="w-full max-w-md">
        <EmployeeLoginForm />
      </div>
    </div>
  );
}