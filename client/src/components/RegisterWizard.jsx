import RegisterStepOne from "./RegisterStepOne";
import RegisterStepTwo from "./RegisterStepTwo";
import RegisterStepThree from "./RegisterStepThree";

function RegisterWizard({
  registerStep,
  setRegisterStep,
  registerData,
  setRegisterData,
  registerMessage,
  authLoading,
  roleOptions,
  registrationSteps,
  registerSummary,
  avatarPreview,
  onStepOneNext,
  onRegister,
  onAvatarChange,
}) {
  return (
    <div className="mt-8 flex flex-col gap-6">
      <div className="flex flex-wrap gap-3">
        {registrationSteps.map((step) => (
          <div
            key={step.id}
            className={`flex items-center gap-3 rounded-full border px-4 py-2 text-sm font-medium ${
              registerStep === step.id
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-600"
            }`}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-xs font-semibold">
              {step.id}
            </span>
            {step.title}
          </div>
        ))}
      </div>

      {registerStep === 1 && (
        <RegisterStepOne
          registerData={registerData}
          setRegisterData={setRegisterData}
          registerMessage={registerMessage}
          authLoading={authLoading}
          roleOptions={roleOptions}
          onContinue={onStepOneNext}
        />
      )}

      {registerStep === 2 && (
        <RegisterStepTwo
          avatarPreview={avatarPreview}
          onFileChange={onAvatarChange}
          onBack={() => setRegisterStep(1)}
          onContinue={() => setRegisterStep(3)}
        />
      )}

      {registerStep === 3 && (
        <RegisterStepThree
          registerSummary={registerSummary}
          registerMessage={registerMessage}
          authLoading={authLoading}
          onBack={() => setRegisterStep(2)}
          onSubmit={onRegister}
        />
      )}
    </div>
  );
}

export default RegisterWizard;
