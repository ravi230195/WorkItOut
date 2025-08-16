import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader } from "./ui/card";
import { TactileButton } from "./TactileButton";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { X, Search, Filter, Dumbbell } from "lucide-react";
import { supabaseAPI, Exercise } from "../utils/supabase-api";
import { toast } from "sonner@2.0.3";

// For fallback compatibility with old Exercise type
interface LegacyExercise {
  id: string;
  name: string;
  category: string;
  muscleGroups: string[];
  equipment: string[];
}

interface ExerciseSelectorProps {
  onSelectExercise: (exercise: Exercise | LegacyExercise) => void;
  onClose: () => void;
}

export function ExerciseSelector({ onSelectExercise, onClose }: ExerciseSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showFilters, setShowFilters] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Load exercises from Supabase
  useEffect(() => {
    const loadExercises = async () => {
      try {
        setIsLoading(true);
        setError("");
        const exercisesData = await supabaseAPI.getExercises();
        setExercises(exercisesData);
      } catch (err) {
        console.error("Failed to load exercises:", err);
        setError("Failed to load exercises. Please try again.");
        toast.error("Failed to load exercises");
      } finally {
        setIsLoading(false);
      }
    };

    loadExercises();
  }, []);

  // Get unique categories from exercises
  const categories = useMemo(() => {
    const uniqueCategories = Array.from(new Set(exercises.map(ex => ex.category)));
    return ["All", ...uniqueCategories.sort()];
  }, [exercises]);

  const filteredExercises = useMemo(() => {
    return exercises.filter(exercise => {
      const matchesSearch = 
        exercise.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exercise.muscle_group?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exercise.category.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory === "All" || exercise.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, selectedCategory, exercises]);

  const handleSelectExercise = (exercise: Exercise) => {
    // Convert Supabase exercise format to legacy format for compatibility
    const legacyExercise: LegacyExercise = {
      id: exercise.id,
      name: exercise.name,
      category: exercise.category,
      muscleGroups: exercise.muscle_group ? [exercise.muscle_group] : [],
      equipment: exercise.equipment ? [exercise.equipment] : []
    };
    
    onSelectExercise(legacyExercise);
    onClose();
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'push':
        return 'bg-[var(--warm-coral)]/10 text-[var(--warm-coral)]';
      case 'pull':
        return 'bg-[var(--warm-sage)]/10 text-[var(--warm-sage)]';
      case 'legs':
        return 'bg-[var(--warm-peach)]/10 text-[var(--warm-brown)]';
      case 'core':
        return 'bg-[var(--warm-mint)]/10 text-[var(--warm-mint)]';
      case 'chest':
        return 'bg-[var(--warm-coral)]/10 text-[var(--warm-coral)]';
      case 'back':
        return 'bg-[var(--warm-sage)]/10 text-[var(--warm-sage)]';
      case 'shoulders':
        return 'bg-[var(--warm-peach)]/10 text-[var(--warm-brown)]';
      case 'arms':
        return 'bg-[var(--warm-mint)]/10 text-[var(--warm-mint)]';
      default:
        return 'bg-[var(--warm-lavender)]/10 text-[var(--warm-lavender)]';
    }
  };

  return (
    <div className="p-4 safe-area-top safe-area-bottom space-y-4 max-w-md mx-auto h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Dumbbell size={20} className="text-[var(--warm-coral)]" />
          <h1 className="font-medium text-[var(--warm-brown)]">Select Exercise</h1>
        </div>
        <TactileButton variant="secondary" size="sm" onClick={onClose}>
          <X size={16} />
        </TactileButton>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--warm-brown)]/50" />
        <Input
          placeholder="Search exercises..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-white/80 backdrop-blur-sm border-[var(--border)]"
          disabled={isLoading}
        />
      </div>

      {/* Filter Toggle */}
      <div className="flex items-center justify-between">
        <TactileButton
          variant={showFilters ? "sage" : "secondary"}
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2"
          disabled={isLoading}
        >
          <Filter size={14} />
          Filters
        </TactileButton>
        <div className="text-sm text-[var(--warm-brown)]/60">
          {isLoading ? "Loading..." : `${filteredExercises.length} exercises`}
        </div>
      </div>

      {/* Category Filters */}
      {showFilters && !isLoading && (
        <Card className="bg-white/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="space-y-3">
              <h3 className="font-medium text-[var(--warm-brown)]">Categories</h3>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <TactileButton
                    key={category}
                    variant={selectedCategory === category ? "sage" : "secondary"}
                    size="sm"
                    onClick={() => setSelectedCategory(category)}
                    className="text-xs"
                  >
                    {category}
                  </TactileButton>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Exercise List */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {isLoading ? (
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardContent className="p-8 text-center">
              <Dumbbell size={32} className="mx-auto mb-3 text-[var(--warm-brown)]/30 animate-pulse" />
              <p className="text-[var(--warm-brown)]/60">
                Loading exercises from Supabase...
              </p>
            </CardContent>
          </Card>
        ) : error ? (
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardContent className="p-8 text-center">
              <Dumbbell size={32} className="mx-auto mb-3 text-red-400" />
              <p className="text-red-600 mb-3">{error}</p>
              <TactileButton
                onClick={() => window.location.reload()}
                variant="secondary"
                size="sm"
              >
                Try Again
              </TactileButton>
            </CardContent>
          </Card>
        ) : filteredExercises.length === 0 ? (
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardContent className="p-8 text-center">
              <Dumbbell size={32} className="mx-auto mb-3 text-[var(--warm-brown)]/30" />
              <p className="text-[var(--warm-brown)]/60">
                No exercises found. Try adjusting your search or filters.
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredExercises.map((exercise) => (
            <Card
              key={exercise.id}
              className="bg-white/80 backdrop-blur-sm border-[var(--border)] hover:border-[var(--warm-coral)]/30 transition-colors cursor-pointer"
              onClick={() => handleSelectExercise(exercise)}
            >
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <h3 className="font-medium text-[var(--warm-brown)]">{exercise.name}</h3>
                    <Badge 
                      variant="secondary" 
                      className={`text-xs ${getCategoryColor(exercise.category)}`}
                    >
                      {exercise.category}
                    </Badge>
                  </div>
                  
                  {exercise.muscle_group && (
                    <div className="flex flex-wrap gap-1">
                      <span className="text-xs px-2 py-1 rounded-full bg-[var(--soft-gray)] text-[var(--warm-brown)]/70">
                        {exercise.muscle_group}
                      </span>
                    </div>
                  )}
                  
                  {exercise.equipment && (
                    <div className="text-xs text-[var(--warm-brown)]/50">
                      {exercise.equipment}
                    </div>
                  )}
                  
                  {exercise.is_user_created && (
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-xs bg-[var(--warm-mint)]/10 text-[var(--warm-mint)]">
                        Custom
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}