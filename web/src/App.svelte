<script lang="ts">
  import logo from "./assets/logo.png";
</script>

<main>
  <div id="root">
    <img src={logo} alt="bpc" />
  </div>
</main>

<style>
  img {
    margin: auto;
    width: 80%;
    max-width: 480px;
  }

  #root {
    margin: -8px;
    display: flex;
    width: 100%;
    height: 100%;
    position: absolute;
    background-color: black;
  }
</style>
