import Image from 'next/image'

function Hero() {
  return (
    <div className="border border-green-400 p-2 flex justify-around items-center">
      <Image
        src="https://image.ibb.co/eSMGz7/Tea_Time_copy.jpg"
        width={500}
        height={500}
        alt="Picture of developer"
        className="p-2 rounded-lg"
      />
      <p class="p-2 mx-2 flex flex-wrap">I am a developer with skills in both front-end and back-end applications. I desire to collaborate with other professionals to build innovative and useful applications. I strive to add my own flavor into captivating designs while focusing on code efficiency, speed optimization, and seamless user experience. I am continuously learning and pushing towards mastering my craft.</p>
    </div>
  );
}

export default Hero;