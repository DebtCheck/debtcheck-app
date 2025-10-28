import {ReactElement} from "react";
import {render as rtlRender, RenderOptions} from "@testing-library/react";
import {NextIntlClientProvider} from "next-intl";
import {SessionProvider} from "next-auth/react";
import {ThemeProvider} from "next-themes";

type Opts = RenderOptions & {
  locale?: string;
  messages?: Record<string, unknown>;
  session?: any;
};

export function renderWithI18n(
  ui: ReactElement,
  {locale = "en", messages = {}, session = null, ...rest}: Opts = {}
) {
  return rtlRender(
    <NextIntlClientProvider locale={locale} messages={messages}>
      {ui}
    </NextIntlClientProvider>,
    rest
  );
}

export * from "@testing-library/react";