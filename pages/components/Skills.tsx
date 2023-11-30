import CartItem from './Cartitem';

function Skills() {
  const skillKit = [
    {name: 'JavaScript', icon: '', image: '', description: 'Proficiency: High'},
    {name: 'PostgreSQL', icon: '', image: '', description: 'Proficiency: High'},
    {name: 'Express', icon: '', image: '', description: 'Proficiency: High'},
    {name: 'NodeJS', icon: '', image: '', description: 'Proficiency: High'},
    {name: 'MarkoJS', icon: '', image: '', description: 'Proficiency: High'},
    {name: 'ReactJS', icon: '', image: '', description: 'Proficiency: High'},
  ];

  const skillKitComponent = skillKit.map((data, index) => {
    return (
      <CartItem key={`${index}-skill`} data={data} />
    );
  });

  return (
    <div className="border border-yellow-400 p-2 flex flex-wrap justify-around items-center">
      <h2>Skills</h2>
      {skillKitComponent}
    </div>
  );
}

export default Skills;