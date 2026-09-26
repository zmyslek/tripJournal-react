declare module "lucide-react" {
  import type { SVGProps } from "react";

  type LucideProps = SVGProps<SVGSVGElement> & {
    size?: number | string;
    strokeWidth?: number | string;
  };

  export const ArrowRight: (props: LucideProps) => JSX.Element;
  export const Check: (props: LucideProps) => JSX.Element;
  export const Edit: (props: LucideProps) => JSX.Element;
  export const HelpCircle: (props: LucideProps) => JSX.Element;
  export const Lock: (props: LucideProps) => JSX.Element;
  export const Settings: (props: LucideProps) => JSX.Element;
  export const Shuffle: (props: LucideProps) => JSX.Element;
  export const Upload: (props: LucideProps) => JSX.Element;
  export const X: (props: LucideProps) => JSX.Element;
}
