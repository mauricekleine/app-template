import { createCn } from "cn/config";
// @mk/utils 2.10.3

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
            "long",
            "section",
            "page",
            "headline",
            "hero",
            "display",
          ],
        },
      ],
    },
  },
});
