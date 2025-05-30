module.exports = {
    apps: [{
        name: "pm-web",
        script: "npm",
        args: ["run", "dev"],
        env: {
            HOST: '0.0.0.0',
            PORT: 3000,
            DANGEROUSLY_DISABLE_HOST_CHECK: 'true',
        }
    }]
}