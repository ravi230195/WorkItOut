import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
  type InputHTMLAttributes,
} from "react";
import { AppScreen, ScreenHeader, Section, Stack } from "../../layouts";
import { BottomNavigation } from "../../BottomNavigation";
import { BottomNavigationButton } from "../../BottomNavigationButton";
import { Avatar, AvatarFallback } from "../../ui/avatar";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import {
  supabaseAPI,
  Profile,
  type GenderType,
  type UnitLength,
  type UnitWeight,
} from "../../../utils/supabase/supabase-api";
import { toast } from "sonner";
import { logger } from "../../../utils/logging";
import SegmentedToggle from "../../segmented/SegmentedToggle";

interface MyAccountScreenProps {
  onBack: () => void;
}

type LengthUnit = UnitLength;
type WeightUnit = UnitWeight;
type GenderOption = GenderType;

interface FormState {
  displayName: string;
  firstName: string;
  lastName: string;
  heightCm: string;
  weightKg: string;
  lengthUnit: LengthUnit;
  weightUnit: WeightUnit;
  gender: GenderOption;
}

type TextFieldKey = "displayName" | "firstName" | "lastName" | "heightCm" | "weightKg";

const DEFAULT_LENGTH_UNIT: LengthUnit = "cm";
const DEFAULT_WEIGHT_UNIT: WeightUnit = "kg";
const DEFAULT_GENDER: GenderOption = "prefer_not_to_say";

const LENGTH_UNIT_LABELS: Record<LengthUnit, string> = {
  cm: "CM",
  m: "M",
};

const WEIGHT_UNIT_LABELS: Record<WeightUnit, string> = {
  kg: "KG",
  lbs: "LBS",
};

const createSegmentedOptions = <Value extends string>(
  labels: Record<Value, string>,
): ReadonlyArray<{ value: Value; label: string }> =>
  Object.entries(labels).map(([value, label]) => ({
    value: value as Value,
    label,
  }));

const LENGTH_UNIT_OPTIONS = createSegmentedOptions<LengthUnit>(LENGTH_UNIT_LABELS);
const WEIGHT_UNIT_OPTIONS = createSegmentedOptions<WeightUnit>(WEIGHT_UNIT_LABELS);

const createEmptyState = (): FormState => ({
  displayName: "",
  firstName: "",
  lastName: "",
  heightCm: "",
  weightKg: "",
  lengthUnit: DEFAULT_LENGTH_UNIT,
  weightUnit: DEFAULT_WEIGHT_UNIT,
  gender: DEFAULT_GENDER,
});

const genderOptions: Array<{ value: GenderOption; label: string }> = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "non_binary", label: "Non-binary" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

export function MyAccountScreen({ onBack }: MyAccountScreenProps) {
  const formId = "my-account-form";
  const [formState, setFormState] = useState<FormState>(() => createEmptyState());
  const [initialState, setInitialState] = useState<FormState>(() => createEmptyState());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      setIsLoading(true);
      try {
        const profile = await supabaseAPI.getMyProfile();
        if (profile) {
          const normalized = normalizeProfile(profile);
          setFormState(normalized);
          setInitialState({ ...normalized });
        } else {
          const fallback = createEmptyState();
          setFormState(fallback);
          setInitialState({ ...fallback });
        }
      } catch (error) {
        logger.error("Failed to load account profile:", error);
        toast.error("Unable to load your profile right now.");
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, []);

  const displayName = useMemo(() => {
    const trimmedDisplay = formState.displayName.trim();
    if (trimmedDisplay) return trimmedDisplay;
    const combined = [formState.firstName.trim(), formState.lastName.trim()]
      .filter(Boolean)
      .join(" ");
    return combined || "User";
  }, [formState.displayName, formState.firstName, formState.lastName]);

  const initials = useMemo(() => {
    const name = displayName;
    if (!name) return "US";
    const parts = name.split(" ").filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }, [displayName]);

  const isDirty = useMemo(() => {
    return JSON.stringify(formState) !== JSON.stringify(initialState);
  }, [formState, initialState]);

  const handleChange = (field: TextFieldKey) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setFormState((prev) => ({ ...prev, [field]: value }));
    };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isSaving || !isDirty) return;

    const trimmedDisplayName = formState.displayName.trim();
    const trimmedFirstName = formState.firstName.trim();
    const trimmedLastName = formState.lastName.trim();

    if (!trimmedDisplayName) {
      toast.error("Display name is required.");
      return;
    }

    const heightValue = parseOptionalNumber(formState.heightCm);
    const weightValue = parseOptionalNumber(formState.weightKg);

    if (heightValue !== undefined && heightValue <= 0) {
      toast.error("Height must be a positive number.");
      return;
    }

    if (weightValue !== undefined && weightValue <= 0) {
      toast.error("Weight must be a positive number.");
      return;
    }

    setIsSaving(true);
    try {
      const updated = await supabaseAPI.upsertProfile({
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
        displayName: trimmedDisplayName,
        heightCm: heightValue,
        weightKg: weightValue,
        lengthUnit: formState.lengthUnit,
        weightUnit: formState.weightUnit,
        gender: formState.gender,
      });

      const nextState = updated ? normalizeProfile(updated) : {
        displayName: trimmedDisplayName,
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
        heightCm: formState.heightCm,
        weightKg: formState.weightKg,
        lengthUnit: formState.lengthUnit,
        weightUnit: formState.weightUnit,
        gender: formState.gender,
      };

      setFormState(nextState);
      setInitialState({ ...nextState });
      logger.info("[MyAccount] Saved profile preferences", {
        lengthUnit: nextState.lengthUnit,
        weightUnit: nextState.weightUnit,
        gender: nextState.gender,
      });
      toast.success("Profile updated successfully.");
    } catch (error) {
      logger.error("Failed to update profile:", error);
      toast.error("Could not save your changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLengthUnitChange = (value: LengthUnit) => {
    if (isLoading || isSaving) return;
    setFormState((prev) => {
      if (prev.lengthUnit === value) return prev;
      logger.info(`[MyAccount] Length unit set to ${value.toUpperCase()}`);
      return { ...prev, lengthUnit: value };
    });
  };

  const handleWeightUnitChange = (value: WeightUnit) => {
    if (isLoading || isSaving) return;
    setFormState((prev) => {
      if (prev.weightUnit === value) return prev;
      logger.info(`[MyAccount] Weight unit set to ${value.toUpperCase()}`);
      return { ...prev, weightUnit: value };
    });
  };

  const handleGenderChange = (value: GenderOption) => {
    if (isLoading || isSaving) return;
    setFormState((prev) => {
      if (prev.gender === value) return prev;
      return { ...prev, gender: value };
    });
  };

  return (
    <AppScreen
      header={
        <ScreenHeader
          title="My Account"
          onBack={onBack}
          showBorder={false}
          denseSmall
          titleClassName="text-[17px] font-bold text-black"
        />
      }
      maxContent="responsive"
      showHeaderBorder={false}
      showBottomBarBorder={false}
      bottomBar={
        <BottomNavigation>
          <BottomNavigationButton
            type="submit"
            form={formId}
            disabled={!isDirty || isSaving || isLoading}
            className="min-w-[160px]"
          >
            {isSaving ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 animate-spin border-2 border-current border-t-transparent rounded-full" />
                Saving...
              </div>
            ) : (
              "Save Changes"
            )}
          </BottomNavigationButton>
        </BottomNavigation>
      }
      bottomBarSticky
      headerInScrollArea={false}
    >
      <form id={formId} onSubmit={handleSubmit} className="h-full">
        <Stack gap="fluid">
          <Section variant="plain" padding="none">
            <div className="rounded-3xl border border-border bg-card/80 backdrop-blur-sm px-6 py-8 text-center shadow-sm">
              <Avatar className="w-20 h-20 mx-auto mb-4 bg-primary text-black shadow-lg shadow-primary/30">
                <AvatarFallback className="bg-primary text-black text-lg font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>

              {isLoading ? (
                <div className="flex items-center justify-center gap-2 text-sm text-black/60">
                  <div className="w-4 h-4 animate-spin border-2 border-current border-t-transparent rounded-full" />
                  Loading profile...
                </div>
              ) : (
                <>
                  <h1 className="text-[clamp(20px,5vw,26px)] font-semibold text-black mb-1">
                    {displayName}
                  </h1>
                  <p className="text-sm text-black/60">
                    Keep your details current to personalize your plan.
                  </p>
                </>
              )}
            </div>
          </Section>

          <Section variant="plain" padding="none">
            <div className="rounded-3xl border border-border bg-card/80 backdrop-blur-sm p-6 shadow-sm space-y-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/60">
                  Personal Information
                </p>
                <h2 className="mt-2 text-lg font-semibold text-black">
                  How should we address you?
                </h2>
                <p className="text-sm text-black/60 mt-1">
                  Update the details you&apos;d like to share with the community.
                </p>
              </div>

              <div className="space-y-4">
                <Field
                  label="Display Name"
                  value={formState.displayName}
                  onChange={handleChange("displayName")}
                  placeholder="eg. Alex Johnson"
                  required
                  disabled={isLoading || isSaving}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="First Name"
                    value={formState.firstName}
                    onChange={handleChange("firstName")}
                    placeholder="First name"
                    disabled={isLoading || isSaving}
                  />
                  <Field
                    label="Last Name"
                    value={formState.lastName}
                    onChange={handleChange("lastName")}
                    placeholder="Last name"
                    disabled={isLoading || isSaving}
                  />
                </div>

                <GenderSelect
                  value={formState.gender}
                  onChange={handleGenderChange}
                  disabled={isLoading || isSaving}
                />
              </div>
            </div>
          </Section>

          <Section variant="plain" padding="none">
            <div className="rounded-3xl border border-border bg-card/80 backdrop-blur-sm p-6 shadow-sm space-y-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/60">
                  Physical Information
                </p>
                <h2 className="mt-2 text-lg font-semibold text-black">
                  Fitness stats help tailor your plan
                </h2>
                <p className="text-sm text-black/60 mt-1">
                  Share optional stats to improve workout recommendations.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Height (cm)"
                  value={formState.heightCm}
                  onChange={handleChange("heightCm")}
                  placeholder="eg. 175"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.1"
                  disabled={isLoading || isSaving}
                />
                <Field
                  label="Weight (kg)"
                  value={formState.weightKg}
                  onChange={handleChange("weightKg")}
                  placeholder="eg. 70"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.1"
                  disabled={isLoading || isSaving}
                />
              </div>
            </div>
          </Section>

          <Section variant="plain" padding="none">
            <div className="rounded-3xl border border-border bg-card/80 backdrop-blur-sm p-6 shadow-sm space-y-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/60">
                  Unit Preferences
                </p>
                <h2 className="mt-2 text-lg font-semibold text-black">
                  Choose how measurements are displayed
                </h2>
                <p className="text-sm text-black/60 mt-1">
                  Select your preferred units for length and weight.
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold uppercase tracking-[0.14em] text-black">
                    Length Units
                  </p>
                  <SegmentedToggle<LengthUnit>
                    value={formState.lengthUnit}
                    onChange={handleLengthUnitChange}
                    options={LENGTH_UNIT_OPTIONS}
                    size="md"
                    variant="filled"
                    tone="accent"
                  />
                </div>

                <div className="h-px bg-border/80" />

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold uppercase tracking-[0.14em] text-black">
                    Weight Units
                  </p>
                  <SegmentedToggle<WeightUnit>
                    value={formState.weightUnit}
                    onChange={handleWeightUnitChange}
                    options={WEIGHT_UNIT_OPTIONS}
                    size="md"
                    variant="filled"
                    tone="accent"
                  />
                </div>
              </div>
            </div>
          </Section>

        </Stack>
      </form>
    </AppScreen>
  );
}

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

interface GenderSelectProps {
  value: GenderOption;
  onChange: (value: GenderOption) => void;
  disabled?: boolean;
}

function GenderSelect({ value, onChange, disabled }: GenderSelectProps) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-[0.18em] text-black/60">
        Gender
      </Label>
      <div className="relative">
        <select
          className="bg-input-background border border-border text-sm h-11 rounded-xl w-full px-4 pr-10 text-black transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none disabled:opacity-50 disabled:cursor-not-allowed appearance-none"
          value={value}
          onChange={(event) => onChange(event.target.value as GenderOption)}
          disabled={disabled}
        >
          {genderOptions.map((option) => (
            <option key={option.value} value={option.value} className="text-black">
              {option.label}
            </option>
          ))}
        </select>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/60"
        >
          <path
            fill="currentColor"
            d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.204l3.71-3.973a.75.75 0 1 1 1.08 1.04l-4.24 4.54a.75.75 0 0 1-1.08 0l-4.25-4.54a.75.75 0 0 1 .02-1.06Z"
          />
        </svg>
      </div>
    </div>
  );
}

function Field({ label, className, ...inputProps }: FieldProps) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-[0.18em] text-black/60">
        {label}
      </Label>
      <Input
        className={`bg-input-background border-border text-sm h-11 rounded-xl ${className ?? ""}`}
        {...inputProps}
      />
    </div>
  );
}

function normalizeProfile(profile: Profile): FormState {
  return {
    displayName: profile.display_name?.trim() ?? "",
    firstName: profile.first_name?.trim() ?? "",
    lastName: profile.last_name?.trim() ?? "",
    heightCm:
      profile.height_cm !== undefined && profile.height_cm !== null
        ? String(profile.height_cm)
        : "",
    weightKg:
      profile.weight_kg !== undefined && profile.weight_kg !== null
        ? String(profile.weight_kg)
        : "",
    lengthUnit: coerceLengthUnit(profile.length_unit),
    weightUnit: coerceWeightUnit(profile.weight_unit),
    gender: coerceGender(profile.gender),
  };
}

function coerceLengthUnit(value: Profile["length_unit"]): LengthUnit {
  return value === "cm" || value === "m" ? value : DEFAULT_LENGTH_UNIT;
}

function coerceWeightUnit(value: Profile["weight_unit"]): WeightUnit {
  return value === "kg" || value === "lbs" ? value : DEFAULT_WEIGHT_UNIT;
}

function coerceGender(value: Profile["gender"]): GenderOption {
  switch (value) {
    case "male":
    case "female":
    case "non_binary":
    case "prefer_not_to_say":
      return value;
    default:
      return DEFAULT_GENDER;
  }
}

function parseOptionalNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return undefined;
  return parsed;
}
