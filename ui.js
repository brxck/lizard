function controlPanel() {
  const defaults = {
    chonk: 1,
    scale: 1,
    speed: 1,
    primaryColor: "#65ab8a",
    secondaryColor: "#a3463e",
    feetPairs: 2,
    headLength: 4,
    bodyLength: 8,
    tailLength: 10,
  };

  return {
    show: false,
    options: { ...defaults },
    defaults,
    showPanel(event) {
      const panel = this.$refs.panel;
      if (!this.show) {
        this.show = true;
        panel.style.left = `${event.clientX}px`;
        panel.style.top = `${event.clientY}px`;
      }
    },
    spawn() {
      spawnLizard(this.options);
      this.show = false;
    },
  };
}
