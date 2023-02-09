const Carousel = (props) => {
  console.log('LE DATA: ', props?.data);
  return (
    <div>
      {props?.data?.map((item) => (
        <p key={item.title} className="text-red-400">{item.title}</p>
      ))}
    </div>
  )
};

export default Carousel;