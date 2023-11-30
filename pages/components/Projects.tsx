import CartItem from './Cartitem';

function Projects() {
  const projectList = [
    {name: 'Minesweeper', icon: '', image: '', description: 'Proficiency: High'},
    {name: 'Gecho', icon: '', image: '', description: 'Proficiency: High'},
    {name: 'DevTab', icon: '', image: '', description: 'Proficiency: High'},
    {name: 'Anjali Site', icon: '', image: '', description: 'Proficiency: High'},
    {name: 'Koral', icon: '', image: '', description: 'Proficiency: High'},
  ];

  const projectListComponent = projectList.map((data, index) => {
    return (
      <CartItem key={`${index}-skill`} data={data} />
    );
  });

  return (
    <div className="border border-purple-400 p-2 flex flex-wrap justify-around items-center">
      <h2>Projects</h2>
      {projectListComponent}
    </div>
  );
}

export default Projects;