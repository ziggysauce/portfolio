function NarBar() {
  return (
    <div className="border border-blue-400 w-screen p-2 flex justify-between items-center">
      <div>
        <button className="bg-blue-500 text-white font-semibold mx-2 p-2 rounded">About</button>
        <button className="bg-blue-500 text-white font-semibold mx-2 p-2 rounded">Projects</button>
        <button className="bg-blue-500 text-white font-semibold mx-2 p-2 rounded">Skills</button>
        <button className="bg-blue-500 text-white font-semibold mx-2 p-2 rounded">Social Links</button>
      </div>
      <div>
        <h1>Dtn</h1>
      </div>
      <div className="flex justify-center items-center">
        <input className="mx-2 rounded p-2" type="text" placeholder="Search..."/>
        <p>[Cart Icon]</p>
      </div>
    </div>
  );
}

export default NarBar;