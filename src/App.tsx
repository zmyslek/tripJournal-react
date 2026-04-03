import Map from "./Map";

function App() {
    return (
        <>
            <nav className="bg-[#7A3F00] py-4 text-center">
                <h1 className="font-adamina text-4x text-[#FFEAD4]">TripJournal</h1>
            </nav>
            <div className="flex justify-center items-center py-6">
                <Map />
            </div>
        </>
    );
}

export default App;