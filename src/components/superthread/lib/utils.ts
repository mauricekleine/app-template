import { createCn } from "cn/config";
// @mk/utils 2.1.1

// The type steps are font sizes (`text-<step>`), so cn merges them with Tailwind's own sizes.
export const cn = createCn({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "meta",
            "instrument",
            "ui",
            "summary",
            "subtitle",
            "read",
            "lede",
            "title",
            "section",
            "page",
            "hero",
            "display",
          ],
        },
      ],
    },
  },
});
