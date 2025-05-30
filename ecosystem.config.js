module.exports = {
  apps: [
    {
      name: "pm-web",
      script: "npm",
      args: ["start"],
      env: {
        HOST: '0.0.0.0',
        PORT: 8080,
        DANGEROUSLY_DISABLE_HOST_CHECK: 'true',
      }
    }
  ]
};