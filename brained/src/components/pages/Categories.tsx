import React from "react";
import { cn } from "@/lib/utils";
import {
  IconArrowWaveRightUp,
  IconBoxAlignRightFilled,
  IconBoxAlignTopLeft,
  IconClipboardCopy,
  IconFileBroken,
  IconSignature,
  IconTableColumn,
} from "@tabler/icons-react";

// Bento Grid Container
export const BentoGrid = ({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) => {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 md:auto-rows-[18rem] md:grid-cols-3 px-4 sm:px-6 lg:px-8",
        className
      )}
    >
      {children}
    </div>
  );
};

// Bento Grid Item
export const BentoGridItem = ({
  className,
  title,
  description,
  header,
  icon,
}: {
  className?: string;
  title?: string | React.ReactNode;
  description?: string | React.ReactNode;
  header?: React.ReactNode;
  icon?: React.ReactNode;
}) => {
  return (
    <div
      className={cn(
        "group/bento shadow-input row-span-1 flex flex-col justify-between space-y-4 rounded-xl border border-neutral-200 bg-white p-4 transition duration-200 hover:shadow-xl dark:border-white/[0.2] dark:bg-black dark:shadow-none",
        className
      )}
    >
      {header}
      <div className="transition duration-200 group-hover/bento:translate-x-2">
        {icon}
        <div className="mt-2 mb-2 font-sans font-bold text-neutral-600 dark:text-neutral-200">
          {title}
        </div>
        <div className="font-sans text-xs font-normal text-neutral-600 dark:text-neutral-300">
          {description}
        </div>
      </div>
    </div>
  );
};

const Skeleton = ({ image }: { image: string }) => (
  <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl overflow-hidden">
    <img
      src={image}
      alt="category"
      className="object-cover w-full h-full rounded-xl transition-transform duration-300 group-hover/bento:scale-105"
    />
  </div>
);

const items = [
  {
    title: "Men’s Fashion",
    description: "Explore the latest trends in men’s clothing and accessories.",
    header: (
      <Skeleton image="/men_fashion.jpg" />
    ),
    icon: <IconClipboardCopy className="h-4 w-4 text-neutral-500" />,
  },
  {
    title: "Women’s Fashion",
    description: "Discover stylish outfits and accessories for every occasion.",
    header: (
      <Skeleton image="/women_fashion.jpg" />
    ),
    icon: <IconSignature className="h-4 w-4 text-neutral-500" />,
  },
  {
    title: "Electronics",
    description: "Shop the latest gadgets, phones, and smart devices.",
    header: (
      <Skeleton image="https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=60" />
    ),
    icon: <IconFileBroken className="h-4 w-4 text-neutral-500" />,
  },
  {
    title: "Home & Living",
    description: "Upgrade your home with furniture, décor, and essentials.",
    header: (
      <Skeleton image="https://images.unsplash.com/photo-1505691723518-36a5ac3be353?auto=format&fit=crop&w=800&q=60" />
    ),
    icon: <IconTableColumn className="h-4 w-4 text-neutral-500" />,
  },
  {
    title: "Beauty & Personal Care",
    description: "Find skincare, makeup, and grooming products you’ll love.",
    header: (
      <Skeleton image="/beauty.jpg" />
    ),
    icon: <IconArrowWaveRightUp className="h-4 w-4 text-neutral-500" />,
  },
  {
    title: "Sports & Fitness",
    description: "Gear up with premium fitness and outdoor equipment.",
    header: (
      <Skeleton image="https://images.unsplash.com/photo-1605296867304-46d5465a13f1?auto=format&fit=crop&w=800&q=60" />
    ),
    icon: <IconBoxAlignTopLeft className="h-4 w-4 text-neutral-500" />,
  },
  {
    title: "Toys & Games",
    description: "Fun and engaging toys for kids and collectors alike.",
    header: (
      <Skeleton image="/toy.jpg" />
    ),
    icon: <IconBoxAlignRightFilled className="h-4 w-4 text-neutral-500" />,
  },
];

// Main Category Section Component
export default function Category() {
  return (
    <section className="w-full bg-gray-50 dark:bg-black">
        <div className="h-10 sm:h-14"></div> 
      <div className="w-full text-center mb-12 px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
          Explore Our Categories
        </h2>
        <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400">
          Discover diverse collections designed to inspire creativity and innovation.
        </p>
      </div>

      <BentoGrid className="w-full">
        {items.map((item, i) => (
          <BentoGridItem
            key={i}
            title={item.title}
            description={item.description}
            header={item.header}
            icon={item.icon}
            className={i === 3 || i === 6 ? "md:col-span-2" : ""}
          />
        ))}
      </BentoGrid>

       <div className="h-10 sm:h-12"></div> 
    </section>
  );
}
