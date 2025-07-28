import UpCards from "./UpCards";
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import TipsAndUpdatesIcon from '@mui/icons-material/TipsAndUpdates';
import BoltIcon from '@mui/icons-material/Bolt';
import Features from "./Features";

function LandingPage() {
  return (
    <div className="bg-white dark:bg-[#1B1E19]">
      <div className="w-screen flex justify-center md:justify-around pt-12 mb-7 px-4 bg-gray-100 dark:bg-[#1B1E19] transition-colors duration-300">
        <div className="flex flex-col md:flex-row md:gap-6 items-center justify-between max-w-screen-xl w-full py-12">
          {/* Left Section */}
          <div className="w-full md:w-1/2 text-left ml-5">
            <h2 className="text-3xl font-bold mb-5 md:py-5 lg:mb-10 text-gray-800 dark:text-white">
              Connect. Collaborate.
              <p>Communicate.</p>
            </h2>

            <div className=" text-gray-700 dark:text-[#e0e0e0] font-medium">
              <p>Your all-in-one video conferencing and chat platform.</p>
              <p>For 1-1 meetings and even wider group discussions , discuss , meet,
                and share ideas with teams or connect with your customers , friends ,
                and even family members.</p>
              <br />
              <a className="cursor-pointer text-blue-600 hover:underline">
                Login
              </a>{" "}
              if you are already a registered user.
            </div>
          </div>

          {/* Right Section */}
          <div className="w-full md:w-1/2">
            <img
              src="videoconfrance-removebg-preview.png"
              alt="Video Conference Illustration"
              className="w-full h-auto object-contain rounded-lg"
            />
          </div>
        </div>
      </div>

      <div className="w-screen flex justify-center md:justify-around  mx-auto bg-white dark:bg-[#181C14]">
        <div className="text-black dark:text-white mt-8 md:mt-16 max-w-screen-xl mb-11">
          <div>
            <p className="flex justify-center items-center text-3xl font-bold">Why Video</p>
            <p className="flex justify-center items-center text-3xl font-bold">Conferencing</p>
          </div>
          <div className="grid md:grid-cols-3 grid-cols-2 gap-x-[2rem] lg:gap-x-[9rem] xl:gap-x-[13rem] md:gap-x-[3rem] gap-y-15 mx-6 py-7 mt-4">
            <UpCards
              icon={<CloudDownloadIcon style={{ color: "#0f57e9" }} />}
              bgColor="#cfdeff"
              title={["No infra or", "travel costs"]}
              description="Everything's on the cloud, which means reduced costs."
            />
            <UpCards
              icon={<TipsAndUpdatesIcon style={{ color: "#f9cb44" }} />}
              bgColor="#fff4d8"
              title={["Help ideas", "take shape"]}
              description="Get everyone alligned to the same goal and boost team spirit."
            />
            <UpCards
              icon={<BoltIcon style={{ color: "#f4986c" }} />}
              bgColor="#f3e2de"
              title={["Get started in", "an instant"]}
              description="With instant meetings, save you and your participants' time."
            />
          </div>
        </div>
      </div>

      <div className="w-screen flex justify-center md:justify-around  mx-auto bg-gray-100 dark:bg-[#1B1E19]">
        <div className="text-black dark:text-white mt-8 md:mt-20 max-w-screen-xl">
          <div>
            <p className="flex justify-center items-center text-3xl font-bold">Features</p>
          </div>
          <div className="grid lg:grid-cols-3 md:grid-cols-2 gap-x-[2rem] lg:gap-x-[10rem] md:gap-x-[7rem] gap-y-15 mx-6 py-7 mt-4">
            <Features 
              imge="card1-removebg-preview.png" 
              title={["Instant video", "conferences"]}
              description="No app, no registration. Just create an account,verify email & share the conference link to start"
            />
            <Features 
              imge="side2-removebg-preview.png" 
              title={["Use chat for", "better context"]}
              description="Share images, lead discussions the right way, and expedite decisions with the onscreen chat"
            />
            <Features 
              imge="side1-removebg-preview.png" 
              title={["Easily control", "your meetings"]}
              description="Advanced features like recard calls enable , send media, permissions, and easy conference control"
            />
          </div>
        </div>
      </div>


    </div>
  );
}

export default LandingPage;
