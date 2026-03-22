import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { db } from '../firebase'
import { doc, getDoc } from 'firebase/firestore'

export default function PersonProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [person, setPerson] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchPerson() {
      const snap = await getDoc(doc(db, 'people', id))
      if (snap.exists()) {
        setPerson({ id: snap.id, ...snap.data() })
      } else {
        navigate('/')
      }
      setLoading(false)
    }
    fetchPerson()
  }, [id])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400 text-sm">Loading...</p>
    </div>
  )

  if (!person) return null

  const age = person.birthDate
    ? Math.floor((new Date(person.deathDate || Date.now()) - new Date(person.birthDate)) / (365.25 * 24 * 60 * 60 * 1000))
    : null

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-lg mx-auto">

        <button
          onClick={() => navigate(-1)}
          className="text-sm text-gray-400 hover:text-gray-600 mb-6 flex items-center gap-1"
        >
          Back
        </button>

        <div className="bg-white rounded-2xl shadow overflow-hidden">

          <div className="bg-blue-600 px-6 py-8 flex flex-col items-center">
            {person.photoURL
              ? (
                <img
                  src={person.photoURL}
                  className="w-24 h-24 rounded-full object-cover border-4 border-white mb-4"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-blue-400 border-4 border-white flex items-center justify-center text-white text-3xl font-bold mb-4">
                  {person.name?.charAt(0)}
                </div>
              )
            }
            <h1 className="text-xl font-bold text-white">{person.name}</h1>
            <p className="text-blue-200 text-sm capitalize mt-1">{person.gender}</p>
            {person.deathDate && (
              <span className="mt-2 bg-gray-800 text-gray-200 text-xs px-3 py-1 rounded-full">
                Deceased
              </span>
            )}
          </div>

          <div className="px-6 py-6 space-y-4">

            {(person.birthDate || person.deathDate) && (
              <div className="flex gap-6">
                {person.birthDate && (
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Born</p>
                    <p className="text-sm font-medium text-gray-700">{person.birthDate}</p>
                  </div>
                )}
                {person.deathDate && (
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Died</p>
                    <p className="text-sm font-medium text-gray-700">{person.deathDate}</p>
                  </div>
                )}
                {age !== null && (
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">
                      {person.deathDate ? 'Age at death' : 'Age'}
                    </p>
                    <p className="text-sm font-medium text-gray-700">{age} years</p>
                  </div>
                )}
              </div>
            )}

            {(person.phone || person.facebookId) && (
              <div className="border-t border-gray-100 pt-4 space-y-3">

                {person.phone && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-green-600 text-sm font-bold">
                      P
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Phone</p>
                      <a
                        href={`tel:${person.phone}`}
                        className="text-sm font-medium text-blue-600 hover:underline"
                      >
                        {person.phone}
                      </a>
                    </div>
                  </div>
                )}

                {person.facebookId && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 text-sm font-bold">
                      F
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Facebook</p>
                      <a 
                        href={`https://facebook.com/${person.facebookId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-medium text-blue-600 hover:underline"
                      >
                        {person.facebookId}
                      </a>
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}