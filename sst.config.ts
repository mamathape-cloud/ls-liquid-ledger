/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "liquid-ledger",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
      providers: {
        aws: {
          profile: "munark-shrinidi",
          region: "ap-south-1",
        },
      },
    };
  },
  async run() {
    // SST forbids top-level imports, so load the local .env here.
    const { config: loadEnv } = await import("dotenv");
    loadEnv({ path: ".env" });

    new sst.aws.Nextjs("LiquidLedger", {
      environment: {
        MONGODB_URI: process.env.MONGODB_URI!,
        JWT_SECRET: process.env.JWT_SECRET!,
        NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME ?? "Liquid Ledger",
        // Lambda's filesystem is read-only except /tmp, so uploads go there.
        UPLOAD_DIR: "/tmp/uploads",
      },
    });
  },
});
